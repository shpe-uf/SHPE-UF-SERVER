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

  let details;
  if (err.response?.data !== undefined) {
    details = err.response.data;
  } else if (err.message) {
    details = err.message;
  } else if (typeof err === 'object') {
    try {
      details = JSON.stringify(err);
    } catch {
      details = String(err);
    }
  } else {
    details = String(err);
  }

  console.error(`[chatbot] ${message}`, details);
}

module.exports = {
  info,
  warn,
  error,
};
