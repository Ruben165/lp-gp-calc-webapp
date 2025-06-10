import "../styles/text-input.css";

function TextInput({
  label,
  id,
  placeholder,
  value,
  onChange,
  textFieldWidth = "28rem",
  textFieldHeight = "6.5rem",
  description = "",
}) {
  return (
    <div className="text-input">
      <label htmlFor={id} className="text-input__label">
        {label}
      </label>
      <div className="text-input__container">
        {id === "listObjective" || id === "listConstraint" ? (
          <textarea
            id={id}
            className="text-input__field"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            style={{
              width: textFieldWidth,
              height: textFieldHeight,
              resize: "vertical",
            }}
          />
        ) : (
          <input
            type="text"
            id={id}
            className="text-input__field"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            style={{ width: textFieldWidth, height: textFieldHeight }}
          />
        )}
        {description && (
          <span className="text-input__description">{description}</span>
        )}
      </div>
    </div>
  );
}

export default TextInput;
