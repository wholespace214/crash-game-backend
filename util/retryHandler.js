const wait = interval => new Promise(resolve => setTimeout(resolve, interval));

const retry = async (fn, args, retriesLeft = 10, interval = 1500) => {
  try {
    return await fn(...args);
  } catch (error) {
    await wait(interval);
    if (retriesLeft === 0) {
      console.error('10 retries failed. Stop trying...', [...args]);
      return;
    }
    return retry(fn, args, --retriesLeft, interval);
  }
};

module.exports = retry;
