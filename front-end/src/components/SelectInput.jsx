import '../styles/text-input.css';

function SelectInput({ label, id, value, onChange, options, selectWidth = "230px" }) {
  return (
    <div className="text-input">
      <label htmlFor={id} className="text-input__label">{label}</label>
      <select
        id={id}
        className="text-input__field"
        value={value}
        onChange={onChange}
        style={{ width: selectWidth }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SelectInput;