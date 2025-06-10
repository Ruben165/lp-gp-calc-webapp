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
    listDecVar: "",
    listObjective: "",
    listConstraint: "",
    objectiveSense: "maximize",
  });

  const handleChange = (e) => {
    var { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const isValidVariableList = (list) => {
    var parsedList = list
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    return parsedList.every((v) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v));
  };

  const isValidEquationList = (list, validVars, isObjective = false) => {
    var parsedList = list
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    var opRegex = /(>=|<=|=|<|>)/;
    var varsInEq;
    return parsedList.every((eq) => {
      if (isObjective) {
        varsInEq = eq.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        return varsInEq.every((v) => validVars.includes(v));
      }
      if (!opRegex.test(eq)) return false;
      varsInEq = eq.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      return varsInEq.every((v) => validVars.includes(v));
    });
  };

  const validateFormData = () => {
    var { listDecVar, listObjective, listConstraint } = formData;
    var parsedDecVar = listDecVar
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    var parsedObjective = listObjective
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    var parsedConstraint = listConstraint
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (!isValidVariableList(listDecVar)) {
      alert(
        "Invalid decision variables! Use alphanumeric names (e.g., x, y) separated by commas."
      );
      return false;
    }

    if (!isValidEquationList(listObjective, parsedDecVar, true)) {
      alert(
        parsedObjective.length === 1
          ? "Invalid objective! Use a linear expression with valid variables (e.g., x+2y)."
          : "Invalid objectives! Each must include an operator (e.g., x+2y>=10) and valid variables."
      );
      return false;
    }

    if (!isValidEquationList(listConstraint, parsedDecVar)) {
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

    var parsedDecVar = formData?.listDecVar
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    var parsedObjective = formData?.listObjective
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    var parsedConstraint = formData?.listConstraint
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    var modifiedFormData = {
      listDecVar: parsedDecVar,
      listObjective: parsedObjective,
      listConstraint: parsedConstraint,
      objectiveSense: formData?.objectiveSense,
    };

    try {
      var response = await fetch("http://localhost:5000/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modifiedFormData),
      });
      var result = await response.json();
      setIsLoading(false);
      navigate("/results", {
        state: { results: result.results, input: result.input },
      });
    } catch (error) {
      alert(error);
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
              border: "1rem solid rgba(0, 0, 0, 0.1)",
              borderLeftColor: "#007bff",
              borderRadius: "50%",
              width: "1rem",
              height: "1rem",
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
              label="Enter the Decision Variables :"
              id="listDecVar"
              placeholder="x1,x2,..."
              value={formData?.listDecVar}
              onChange={handleChange}
              textFieldHeight="2.2rem"
              description="*Separate with commas (if more than one)"
            />
            <TextInput
              label="Enter the Objective Functions :"
              id="listObjective"
              placeholder={"5*x1+4*x2\nor\nx1+2*x2>=8,\n3*x1-x2<=12\n..."}
              value={formData?.listObjective}
              onChange={handleChange}
              description={
                "*Separate the objectives with commas and assign the targets (if more than one)\nOtherwise, just type it in without the targets"
              }
            />
            {formData?.listObjective?.split(",").length === 1 && (
              <SelectInput
                label="Optimization Direction:"
                id="objectiveSense"
                value={formData?.objectiveSense}
                onChange={handleChange}
                options={[
                  { value: "maximize", label: "Maximize" },
                  { value: "minimize", label: "Minimize" },
                ]}
              />
            )}
            <TextInput
              label="Enter the Constraints :"
              id="listConstraint"
              placeholder={"x1+x2<=12,\nx1-x2>=3\n..."}
              value={formData?.listConstraint}
              onChange={handleChange}
              description={"*Separate with commas (if more than one)"}
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
                title="Not Yet"
              >
                Not Yet
              </button>
              <button className="confirm" onClick={handleConfirm} title="Go">
                Go
              </button>
            </div>
          </Modal>
          <div style={{ marginTop: "1.7rem" }}></div>
          <Footer />
        </>
      )}
    </>
  );
}

export default MainPage;
