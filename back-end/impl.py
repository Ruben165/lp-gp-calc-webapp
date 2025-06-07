from flask import Flask, request, jsonify, Response
from flask_cors import CORS, cross_origin
from pulp import LpProblem, LpVariable, LpMinimize, LpMaximize, lpSum, LpStatus
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import matplotlib.pyplot as plt
from datetime import datetime
import numpy as np
import re

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

@app.route('/solve', methods=['POST'])
def solve():
    # Get Data
    data = request.json

    try:
        num_dec_var = int(data.get('numDecVar'))

        list_dec_var = [v.strip() for v in data.get('listDecVar', '').split(',') if v.strip()]

        num_objective = int(data.get('numObjective'))

        list_objective = [v.strip() for v in data.get('listObjective', '').split(',') if v.strip()]

        num_constraint = int(data.get('numConstraint'))

        list_constraint = [v.strip() for v in data.get('listConstraint', '').split(',') if v.strip()]

        objective_sense = data.get('objectiveSense', 'maximize').lower()

    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid input: {str(e)}"}), 400

    if len(list_dec_var) != num_dec_var:
        return jsonify({"error": f"Expected {num_dec_var} decision variables, got {len(list_dec_var)}"}), 400
    if len(list_objective) != num_objective:
        return jsonify({"error": f"Expected {num_objective} objectives, got {len(list_objective)}"}), 400
    if len(list_constraint) != num_constraint:
        return jsonify({"error": f"Expected {num_constraint} constraints, got {len(list_constraint)}"}), 400
    if objective_sense not in ['maximize', 'minimize']:
        return jsonify({"error": "Objective sense must be 'maximize' or 'minimize'"}), 400

    results = {"linearProgramming": [], "goalProgramming": None}

    decision_vars = {v: LpVariable(v, cat='Integer', lowBound=0) for v in list_dec_var}

    user_lower_bounds = set()
    for constr in list_constraint:
        if '>=' in constr:
            lhs, rhs = constr.split('>=')
            lhs = lhs.strip()
            rhs = float(rhs.strip())
            if lhs in list_dec_var and rhs >= 0:
                user_lower_bounds.add(lhs)
                decision_vars[lhs].lowBound = rhs

    def parse_equation(equation, variables, is_objective=False):
        equation = equation.replace(' ', '')
        epsilon = 1e-5

        if is_objective and num_objective == 1 and not any(op in equation for op in ['<=', '>=', '==', '=', '<', '>']):
            expr = 0
            equation = re.sub(r'(?<!\d)([+-])(?=\d*\.?\d*[a-zA-Z_])', r' \1 ', equation)
            equation = equation.replace('+', ' + ').replace('-', ' - ')
            terms = [t for t in equation.split() if t not in ['+', '-']]

            for term in terms:
                coeff_match = re.match(r'([+-]?\d*\.?\d+[eE]?-?\d*)?\*?([a-zA-Z_][a-zA-Z0-9_]*)', term)
                if coeff_match:
                    coeff_str = coeff_match.group(1)
                    var = coeff_match.group(2)
                    if coeff_str is None or coeff_str in ['+', '-', '']:
                        c = 1.0 if coeff_str in ['+', '', None] else -1.0
                    else:
                        c = float(coeff_str)
                    if var in variables:
                        expr += c * variables[var]
                elif re.match(r'[+-]?\d+\.?\d*[eE]?-?\d*', term):
                    expr += float(term)

            return expr, None, None
        
        for op, op_type in [('<=', '<='), ('>=', '>='), ('==', '=='), ('=', '=='), ('<', '<='), ('>', '>=')]:
            if op in equation:
                lhs, rhs = equation.split(op)
                try:
                    rhs = float(rhs.strip())
                except ValueError:
                    return None, None, None, f"Invalid RHS in '{equation}'"
                if op == '<':
                    rhs -= epsilon
                elif op == '>':
                    rhs += epsilon
                
                expr = 0
                lhs = re.sub(r'(?<!\d)([+-])(?=\d*\.?\d*[a-zA-Z_])', r' \1 ', lhs)
                lhs = lhs.replace('+', ' + ').replace('-', ' - ')
                terms = [t for t in lhs.split() if t not in ['+', '-']]

                for term in terms:
                    coeff_match = re.match(r'([+-]?\d*\.?\d+[eE]?-?\d*)?\*?([a-zA-Z_][a-zA-Z0-9_]*)', term)
                    if coeff_match:
                        coeff_str = coeff_match.group(1)
                        var = coeff_match.group(2)
                        if coeff_str is None or coeff_str in ['+', '-', '']:
                            c = 1.0 if coeff_str in ['+', '', None] else -1.0
                        else:
                            c = float(coeff_str)
                        if var in variables:
                            expr += c * variables[var]
                    elif re.match(r'[+-]?\d+\.?\d*[eE]?-?\d*', term):
                        expr += float(term)

                return expr, op_type, rhs
            
        return None, None, None, f"No valid operator in '{equation}'"

    if num_objective == 1:
        obj = list_objective[0]
        parsed = parse_equation(obj, decision_vars, is_objective=True)

        if len(parsed) == 4:
            return jsonify({"error": parsed[3]}), 400
        
        lhs_expr, _, _ = parsed

        if lhs_expr is None:
            return jsonify({"error": f"Invalid objective: {obj}"}), 400
        
        sense = LpMaximize if objective_sense == 'maximize' else LpMinimize

        model = LpProblem("LP_Objective", sense)

        model += lhs_expr

        for constr in list_constraint:
            parsed = parse_equation(constr, decision_vars)
            if len(parsed) == 4:
                return jsonify({"error": parsed[3]}), 400
            expr, op, rhs = parsed
            if expr is None:
                return jsonify({"error": f"Invalid constraint: {constr}"}), 400
            if op == '>=':
                model += expr >= rhs
            elif op == '<=':
                model += expr <= rhs
            elif op == '==':
                model += expr == rhs

        for var_name, var in decision_vars.items():
            if var_name not in user_lower_bounds:
                model += var >= 0, f"NonNegativity_{var_name}"

        print(model)

        model.solve()

        results["linearProgramming"].append({
            "objectiveIndex": 1,
            "status": LpStatus[model.status],
            "objectiveValue": model.objective.value() if model.status == 1 else None,
            "variables": {v.name: v.varValue for v in model.variables() if v.varValue is not None}
        })
    else:
        model = LpProblem("Goal_Programming", LpMinimize)
        deviations = {f"d_minus_{i}": LpVariable(f"d_minus_{i}", cat='Continuous', lowBound=0) for i in range(num_objective)}
        deviations.update({f"d_plus_{i}": LpVariable(f"d_plus_{i}", cat='Continuous', lowBound=0) for i in range(num_objective)})

        # Minimize only undesirable deviations based on constraint type
        obj_terms = []
        for i, obj in enumerate(list_objective):
            parsed = parse_equation(obj, decision_vars, is_objective=True)
            if len(parsed) == 4:
                return jsonify({"error": parsed[3]}), 400
            expr, op, rhs = parsed
            if expr is None or op is None:
                return jsonify({"error": f"Invalid objective: {obj}"}), 400
            if op == '>=':
                model += expr + deviations[f"d_minus_{i}"] - deviations[f"d_plus_{i}"] == rhs, f"Objective_{i}_geq"
                obj_terms.append(deviations[f"d_minus_{i}"])  # Minimize underachievement
            elif op == '<=':
                model += expr + deviations[f"d_minus_{i}"] - deviations[f"d_plus_{i}"] == rhs, f"Objective_{i}_leq"
                obj_terms.append(deviations[f"d_plus_{i}"])   # Minimize overachievement
            elif op == '==':
                model += expr + deviations[f"d_minus_{i}"] - deviations[f"d_plus_{i}"] == rhs, f"Objective_{i}_eq"
                obj_terms.append(deviations[f"d_minus_{i}"] + deviations[f"d_plus_{i}"])  # Minimize both

        model += lpSum(obj_terms)

        for constr in list_constraint:
            parsed = parse_equation(constr, decision_vars)
            if len(parsed) == 4:
                return jsonify({"error": parsed[3]}), 400
            expr, op, rhs = parsed
            if expr is None:
                return jsonify({"error": f"Invalid constraint: {constr}"}), 400
            if op == '>=':
                model += expr >= rhs
            elif op == '<=':
                model += expr <= rhs
            elif op == '==':
                model += expr == rhs

        for var_name, var in decision_vars.items():
            if var_name not in user_lower_bounds:
                model += var >= 0, f"NonNegativity_{var_name}"

        print(model)

        model.solve()

        results["goalProgramming"] = {
            "status": LpStatus[model.status],
            "objectiveValue": model.objective.value() if model.status == 1 else None,
            "variables": {v.name: v.varValue for v in model.variables() if v.varValue is not None}
        }

    display_constraints = list_constraint.copy()
    display_constraints.extend([f"{v}>=0" for v in list_dec_var if v not in user_lower_bounds])

    return jsonify({
        "results": results,
        "input": {
            "numDecVar": num_dec_var,
            "listDecVar": list_dec_var,
            "numObjective": num_objective,
            "listObjective": list_objective,
            "numConstraint": len(display_constraints),
            "listConstraint": display_constraints,
            "objectiveSense": objective_sense
        }
    })

@app.route('/download-report', methods=['POST'])
@cross_origin(origin='localhost', headers=['Content-Type', 'Authorization'])
def download_report():
    data = request.json

    input_data = data.get("input", {})
    list_dec_var = input_data.get("listDecVar", []) or ["No variables provided"]
    list_objective = input_data.get("listObjective", []) or ["No objectives provided"]
    list_constraint = input_data.get("listConstraint", []) or ["No constraints provided"]
    objective_sense = input_data.get("objectiveSense", "N/A")

    results = data.get("results", {})
    linear_results = results.get("linearProgramming", [])
    goal_result = results.get("goalProgramming", None)

    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20, bottomMargin=20)
    styles = getSampleStyleSheet()
    
    # Define custom styles
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=6,
        textColor=colors.darkblue
    )
    section_style = ParagraphStyle(
        name='SectionStyle',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=6,
        textColor=colors.black
    )
    body_style = ParagraphStyle(
        name='BodyStyle',
        parent=styles['BodyText'],
        fontSize=10,
        spaceAfter=6,
        leading=12
    )
    table_label_style = ParagraphStyle(
        name='TableLabelStyle',
        parent=styles['BodyText'],
        fontSize=10,
        leading=12,
        wordWrap='CJK'
    )

    elements = []

    # Title
    elements.append(Paragraph("Optimization Analysis Report", title_style))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%d-%m-%Y %H:%M:%S')} WIB", body_style))
    elements.append(Spacer(1, 6))

    # Input Summary
    elements.append(Paragraph("Input Summary", section_style))
    
    # Decision Variables
    elements.append(Paragraph("Decision Variables:", body_style))
    dec_var_text = ", ".join(map(str, list_dec_var)) if list_dec_var and list_dec_var != ["No variables provided"] else "None"
    elements.append(Paragraph(dec_var_text, body_style))
    elements.append(Spacer(1, 6))

    # Optimization Direction (for single-objective LP)
    if input_data.get("numObjective") == 1:
        elements.append(Paragraph("Optimization Direction:", body_style))
        elements.append(Paragraph(objective_sense.capitalize(), body_style))
        elements.append(Spacer(1, 6))

    # Objective Functions
    elements.append(Paragraph("Objective Functions:", body_style))
    if list_objective and list_objective != ["No objectives provided"]:
        for obj in list_objective:
            elements.append(Paragraph(f"• {obj}", body_style))
    else:
        elements.append(Paragraph("None", body_style))
    elements.append(Spacer(1, 6))

    # Constraints
    elements.append(Paragraph("Constraints:", body_style))
    if list_constraint and list_constraint != ["No constraints provided"]:
        for constr in list_constraint:
            elements.append(Paragraph(f"• {constr}", body_style))
    else:
        elements.append(Paragraph("None", body_style))
    elements.append(Spacer(1, 6))

    # Linear Programming Results (only if single objective)
    if linear_results:
        elements.append(Paragraph("Linear Programming Results", section_style))
        for i, result in enumerate(linear_results):
            elements.append(Paragraph(f"Objective {i + 1}", body_style))
            table_data = [
                [Paragraph("Status", table_label_style), result.get('status', 'N/A')],
                [Paragraph("Objective Value", table_label_style), str(result.get('objectiveValue', 'N/A'))],
                [Paragraph("Variables", table_label_style), ""]
            ]
            for k, v in result.get('variables', {}).items():
                table_data.append([k, str(v)])
            
            table = Table(table_data, colWidths=[150, 250])
            table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4)
            ]))
            elements.append(table)
            elements.append(Spacer(1, 6))

    # Goal Programming Results (only if multiple objectives)
    if goal_result:
        elements.append(Paragraph("Goal Programming Results", section_style))
        table_data = [
            [Paragraph("Status", table_label_style), goal_result.get('status', 'N/A')],
            [Paragraph("Objective Value (Sum of Deviations)", table_label_style), str(goal_result.get('objectiveValue', 'N/A'))],
            [Paragraph("Variables", table_label_style), ""]
        ]
        for k, v in goal_result.get('variables', {}).items():
            table_data.append([k, str(v)])
        
        table = Table(table_data, colWidths=[150, 250])
        table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4)
        ]))
        elements.append(table)
        elements.append(Spacer(1, 6))

    # Bar Chart for Decision Variable Values
    plt.figure(figsize=(4, 3))
    var_names = []
    var_values = []
    bar_colors = []

    # Extract decision variables from input
    decision_vars = set(list_dec_var) if list_dec_var and list_dec_var != ["No variables provided"] else set()

    # Linear Programming variables
    if linear_results:
        for result in linear_results:
            variables = result.get('variables', {})
            for var in decision_vars:
                if var in variables and variables[var] is not None:
                    var_names.append(f"{var} (LP)")
                    var_values.append(float(variables[var]))
                    bar_colors.append('#4CAF50')

    # Goal Programming variables
    if goal_result:
        variables = goal_result.get('variables', {})
        for var in decision_vars:
            if var in variables and variables[var] is not None:
                var_names.append(f"{var} (GP)")
                var_values.append(float(variables[var]))
                bar_colors.append('#2196F3')

    if var_names:
        # Create horizontal bar chart
        # Create custom y-positions to reduce gaps
        y_positions = np.arange(len(var_names)) * 0.4  # Reduce gap by scaling positions
        bars = plt.barh(y_positions, var_values, color=bar_colors, height=0.3)
        plt.yticks(y_positions, var_names)  # Set y-tick labels
        plt.title("Decision Variable Values", fontsize=12)
        plt.xlabel("Variable Value", fontsize=10)
        plt.ylabel("Variable", fontsize=10)
        plt.tight_layout()

        # Add value labels at the end of each bar
        for i, bar in enumerate(bars):
            width = bar.get_width()
            plt.text(
                x=width + 0.01,
                y=y_positions[i],
                s=f'{var_values[i]:.0f}',
                ha='left',
                va='center',
                fontsize=10
            )

        chart_buffer = io.BytesIO()
        plt.savefig(chart_buffer, format='PNG', dpi=100)
        plt.close()
        chart_buffer.seek(0)

        elements.append(Paragraph("Decision Variable Values", section_style))
        elements.append(Spacer(1, 6))
        elements.append(Image(chart_buffer, width=400, height=300))
    else:
        elements.append(Paragraph("No decision variable values available for charting.", body_style))

    # Build the PDF
    try:
        doc.build(elements)
    except Exception as e:
        return jsonify({"error": "Failed to generate PDF"}), 500

    buffer.seek(0)

    # Send the PDF as a Response object
    response = Response(
        buffer.getvalue(),
        mimetype='application/pdf',
        headers={
            'Content-Disposition': 'attachment; filename=analysis_report.pdf'
        }
    )

    return response

if __name__ == '__main__':
    app.run(debug=True)