import "./SelectDropdown.css";

const SelectDropdown = ({
  id,
  value,
  options,
  placeholder,
  isOpen,
  onChange,
  onToggle,
  classNamePrefix,
  showHasValueClass = false,
}) => {
  const selectedOption = options.find(
    (option) => String(option.id) === String(value),
  );
  const rootClassName = [
    "select-dropdown",
    classNamePrefix,
    isOpen ? "is-open" : "",
    showHasValueClass && value ? "has-value" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      <button
        className={`select-dropdown__button ${classNamePrefix}__button`}
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.name || placeholder}</span>
        <span className={`select-dropdown__arrow ${classNamePrefix}__arrow`} />
      </button>

      {isOpen && (
        <div
          className={`select-dropdown__menu ${classNamePrefix}__menu`}
          role="listbox"
        >
          <button
            className={`select-dropdown__option ${classNamePrefix}__option ${
              value ? "" : "is-selected"
            }`}
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => onChange("")}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              className={`select-dropdown__option ${classNamePrefix}__option ${
                String(option.id) === String(value) ? "is-selected" : ""
              }`}
              key={`${id}-${option.id}`}
              type="button"
              role="option"
              aria-selected={String(option.id) === String(value)}
              onClick={() => onChange(String(option.id))}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;
