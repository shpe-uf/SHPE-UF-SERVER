function info(message, data = undefined) {
  if (data === undefined) {
    console.log(`[chatbot] ${message}`);
    return;
  }

  console.log(`[chatbot] ${message}`, data);
}

function warn(message, data = undefined) {
  if (data === undefined) {
    console.warn(`[chatbot] ${message}`);
    return;
  }

  console.warn(`[chatbot] ${message}`, data);
}

function error(message, err = undefined) {
  if (!err) {
    console.error(`[chatbot] ${message}`);
    return;
  }

  const details = err.response?.data || err.message || String(err);
  console.error(`[chatbot] ${message}`, details);
}

module.exports = {
  info,
  warn,
  error,
};
