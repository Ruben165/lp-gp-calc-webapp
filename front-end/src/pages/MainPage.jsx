import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SubHeader from "../components/SubHeader";
import TextInput from "../components/TextInput";
import SelectInput from "../components/SelectInput";
import SubmitButton from "../components/SubmitButton";
import Modal from "../components/Modal";
import Footer from "../components/Footer";

function MainPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [formData, setFormData] = useState({
    numDecVar: "",
    listDecVar: "",
    numObjective: "",
    listObjective: "",
    numConstraint: "",
    listConstraint: "",
    objectiveSense: "maximize",
  });

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id.startsWith("num")) {
      if (!/^\d*$/.test(value)) return;
      const limits = { numDecVar: 6, numObjective: 8, numConstraint: 10 };
      const max = limits[id];
      const numericValue = Number(value);
      setFormData((prev) => ({
        ...prev,
        [id]: numericValue > max ? String(max) : value,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const isValidVariableList = (list, expectedCount) => {
    const validFormat = list.every((v) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v));
    return list.length === parseInt(expectedCount, 10) && validFormat;
  };

  const isValidEquationList = (
    list,
    expectedCount,
    validVars,
    isObjective = false
  ) => {
    if (list.length !== expectedCount) return false;
    const opRegex = /(>=|<=|=|<|>)/;
    return list.every((eq) => {
      if (isObjective && expectedCount === 1) {
        const varsInEq = eq.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        return varsInEq.every((v) => validVars.includes(v));
      }
      if (!opRegex.test(eq)) return false;
      const varsInEq = eq.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      return varsInEq.every((v) => validVars.includes(v));
    });
  };

  const validateFormData = () => {
    let {
      numDecVar,
      listDecVar,
      numObjective,
      listObjective,
      numConstraint,
      listConstraint,
    } = formData;
    numDecVar = parseInt(numDecVar, 10);
    listDecVar = listDecVar
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    numObjective = parseInt(numObjective, 10);
    listObjective = listObjective
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    numConstraint = parseInt(numConstraint, 10);
    listConstraint = listConstraint
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (!isValidVariableList(listDecVar, numDecVar)) {
      alert(
        "Invalid decision variables! Use alphanumeric names (e.g., x, y) separated by commas."
      );
      return false;
    }

    if (!isValidEquationList(listObjective, numObjective, listDecVar, true)) {
      alert(
        numObjective === 1
          ? "Invalid objective! Use a linear expression with valid variables (e.g., x+2y)."
          : "Invalid objectives! Each must include an operator (e.g., x+2y>=10) and valid variables."
      );
      return false;
    }

    if (!isValidEquationList(listConstraint, numConstraint, listDecVar)) {
      alert(
        "Invalid constraints! Each must include an operator (e.g., x+y>=6) and valid variables."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!validateFormData()) return;
    setShowConfirmModal(false);
    setIsLoading(true);

    const modifiedFormData = {
        ...formData,
        listObjective: formData.listObjective.replace(/\n/g, ","),
        listConstraint: formData.listConstraint.replace(/\n/g, ","),
    };

    try {
      const response = await fetch("http://localhost:5000/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modifiedFormData),
      });
      const result = await response.json();
      setIsLoading(false);
      navigate("/results", {
        state: { results: result.results, input: result.input },
      });
    } catch (error) {
      console.error("Error: ", error);
      alert("Something went wrong!");
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            textAlign: "center",
          }}
        >
          <div
            style={{
              border: "4px solid rgba(0, 0, 0, 0.1)",
              borderLeftColor: "#007bff",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <p>Calculating...</p>
        </div>
      ) : (
        <>
          <Header />
          <SubHeader />
          <div
            style={{
              gap: "1.2rem",
              padding: "1.8rem",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: "90vw",
              marginLeft: "1rem",
            }}
          >
            <TextInput
              label="How Many Decision Variables?"
              id="numDecVar"
              placeholder="*..."
              value={formData.numDecVar}
              onChange={handleChange}
              textFieldWidth="230px"
              description="*Enter Whole Numbers Only (1,...,8)"
            />
            <TextInput
              label="Enter the Decision Variables :"
              id="listDecVar"
              placeholder="*..."
              value={formData.listDecVar}
              onChange={handleChange}
              textFieldWidth="440px"
              description="*Separate the Variables with Commas (Example: x1,x2,...)"
            />
            <TextInput
              label="How Many Objectives?"
              id="numObjective"
              placeholder="*..."
              value={formData.numObjective}
              onChange={handleChange}
              textFieldWidth="230px"
              description="*Enter Whole Numbers Only (1,...,8)"
            />
            {formData.numObjective === "1" && (
              <SelectInput
                label="Optimization Direction:"
                id="objectiveSense"
                value={formData.objectiveSense}
                onChange={handleChange}
                options={[
                  { value: "maximize", label: "Maximize" },
                  { value: "minimize", label: "Minimize" },
                ]}
                selectWidth="230px"
              />
            )}
            <TextInput
              label="Enter the Objective Functions :"
              id="listObjective"
              placeholder="*..."
              value={formData.listObjective}
              onChange={handleChange}
              textFieldWidth="440px"
              textFieldHeight="100px"
              description={
                formData.numObjective === "1"
                  ? "*Example: x+2y (no operator needed)"
                  : "*If there are multiple objectives,\nseparate the Objective Functions with Commas and assign the target\nExample: x1+2*x2>=8,3*x1-x2<=12\nOtherwise, just type in the objective function without the target\nExample: 5*x1+4*x2"
              }
            />
            <TextInput
              label="How Many Constraints?"
              id="numConstraint"
              placeholder="*..."
              value={formData.numConstraint}
              onChange={handleChange}
              textFieldWidth="230px"
              description="*Enter Whole Numbers Only (1,...,8)"
            />
            <TextInput
              label="Enter the Constraints :"
              id="listConstraint"
              placeholder="*..."
              value={formData.listConstraint}
              onChange={handleChange}
              textFieldWidth="440px"
              textFieldHeight="100px"
              description={"*Separate the Constraints with Commas (if more than one)\nExample:\nx1+x2<=12,x1-x2>=3"}
            />
            <div style={{ marginLeft: "16.65rem" }}>
              <SubmitButton
                text="Calculate"
                onClick={handleSubmit}  
                style={{ margin: "0" }}
              />
            </div>
          </div>
          <Modal
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
          >
            <h3>Proceed To Calculate?</h3>
            <div className="modal-buttons">
              <button
                className="cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Not Yet
              </button>
              <button className="confirm" onClick={handleConfirm}>
                Go
              </button>
            </div>
          </Modal>
          <Footer />
        </>
      )}
    </>
  );
}

export default MainPage;