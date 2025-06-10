import "../styles/submit-button.css";

function SubmitButton({ text, onClick, type = "button", style = {} }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="submit-button"
      style={style}
      title={text}
    >
      {text}
    </button>
  );
}

export default SubmitButton;
