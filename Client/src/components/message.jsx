function Message({ user, text }) {
  return (
    <div className="message">
      <strong>{user}</strong>
      <p>{text}</p>
    </div>
  );
}

export default Message;

