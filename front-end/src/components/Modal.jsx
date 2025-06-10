import "../styles/modal.css";

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) {
    return null;
  } else {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose} title="Close">
            ×
          </button>
          {children}
        </div>
      </div>
    );
  }
}

export default Modal;
