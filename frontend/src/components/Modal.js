const Modal = ({ message, onClose, onNavigate }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50" role="dialog" aria-labelledby="modal-title" aria-describedby="modal-description">
      <div className="bg-white p-8 rounded-lg shadow-lg w-1/3">
        <h2 id="modal-title" className="text-xl font-semibold mb-4">{message}</h2>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md mr-2"
          >
            Close
          </button>
          <button
            onClick={onNavigate}  // This triggers the navigation
            className="px-4 py-2 bg-blue-500 text-white rounded-md"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
