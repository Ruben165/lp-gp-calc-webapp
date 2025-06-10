import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Modal from "../components/Modal";
import Footer from "../components/Footer";
import "../styles/result-page.css";

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const results = location.state?.results ?? {};
  const input = location.state?.input ?? {};

  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!results || (!results.linearProgramming && !results.goalProgramming)) {
      navigate("/");
    }
  }, [results, navigate]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      var payload = { results, input };
      var response = await fetch("http://localhost:5000/download-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }

      var blob = await response.blob();
      var url = window.URL.createObjectURL(blob);
      window.open(url);
    } catch (error) {
      alert(error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!results || (!results.linearProgramming && !results.goalProgramming)) {
    return <p>No results found!</p>;
  }

  return (
    <>
      {isGenerating ? (
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
          <p>Generating...</p>
        </div>
      ) : (
        <>
          <Header />
          <div className="result-container">
            <h2 className="heading">Optimization Result</h2>

            <div className="section">
              <h3 className="sub-heading">Input Summary</h3>
              <p className="text">
                <strong>Decision Variables:</strong>{" "}
                {Array.isArray(input.listDecVar)
                  ? input.listDecVar.join(", ")
                  : "None"}
              </p>
              {input.numObjective === 1 && input.objectiveSense && (
                <p className="text">
                  <strong>Optimization Direction:</strong>{" "}
                  {input.objectiveSense.charAt(0).toUpperCase() +
                    input.objectiveSense.slice(1)}
                </p>
              )}
              <p className="text">
                <strong>Objective Functions:</strong>
              </p>
              <ul className="list">
                {Array.isArray(input.listObjective) &&
                input.listObjective.length > 0 ? (
                  input.listObjective.map((obj, idx) => (
                    <li key={idx} className="list-item">
                      {obj.trim()}
                    </li>
                  ))
                ) : (
                  <li className="list-item">No objectives provided</li>
                )}
              </ul>
              <p className="text">
                <strong>Constraints:</strong>
              </p>
              <ul className="list">
                {Array.isArray(input.listConstraint) &&
                input.listConstraint.length > 0 ? (
                  input.listConstraint.map((c, idx) => (
                    <li key={idx} className="list-item">
                      {c.trim()}
                    </li>
                  ))
                ) : (
                  <li className="list-item">No constraints provided</li>
                )}
              </ul>
            </div>

            {results.linearProgramming &&
              results.linearProgramming.length > 0 && (
                <div className="section">
                  <h3 className="sub-heading">Linear Programming</h3>
                  {results.linearProgramming.map((lp, index) => (
                    <div key={index} className="result-card">
                      <strong className="result-card-title">
                        Objective {index + 1}
                      </strong>
                      <div>
                        <p className="text">
                          <strong>Status:</strong> {lp.status}
                        </p>
                        <p className="text">
                          <strong>Objective Value:</strong> {lp.objectiveValue}
                        </p>
                        <p className="text">
                          <strong>Variable Values:</strong>
                        </p>
                        <ul className="list">
                          {Object.entries(lp.variables).map(([key, value]) => (
                            <li key={key} className="list-item">
                              {key}: {value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {results.goalProgramming && (
              <div className="section">
                <h3 className="sub-heading">Goal Programming</h3>
                <div className="result-card">
                  <p className="text">
                    <strong>Status:</strong> {results.goalProgramming.status}
                  </p>
                  <p className="text">
                    <strong>Objective Value (Sum of Deviations):</strong>{" "}
                    {results.goalProgramming.objectiveValue}
                  </p>
                  <p className="text">
                    <strong>Variable Values:</strong>
                  </p>
                  <ul className="list">
                    {Object.entries(results.goalProgramming.variables).map(
                      ([key, value]) => (
                        <li key={key} className="list-item">
                          {key}: {value}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                marginTop: "2rem",
                marginBottom: "2rem",
              }}
            >
              <button
                className="button-back"
                onClick={() => setShowBackConfirmModal(true)}
                title="Back"
              >
                Back
              </button>

              <button
                className="button-download"
                onClick={handleDownload}
                title="Download Analysis File"
              >
                Download Analysis File
              </button>
            </div>

            <Modal
              isOpen={showBackConfirmModal}
              onClose={() => setShowBackConfirmModal(false)}
            >
              <h3>Back to Input Page?</h3>
              <div className="modal-buttons">
                <button
                  className="cancel"
                  onClick={() => setShowBackConfirmModal(false)}
                  title="Not Yet"
                >
                  Not Yet
                </button>
                <button
                  className="confirm"
                  onClick={() => navigate("/")}
                  title="Go"
                >
                  Go
                </button>
              </div>
            </Modal>
          </div>
          <Footer />
        </>
      )}
    </>
  );
}

export default ResultPage;
