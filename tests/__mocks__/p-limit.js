module.exports = function () {
  // Return a simple limiter that runs functions immediately
  return async function (fn) {
    return await fn();
  };
};