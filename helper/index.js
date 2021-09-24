exports.isAdmin = (req) => !(req.user.admin === false && req.params.userId !== req.user.id);
exports.generate = (n) => {
  const add = 1;
  let max = 12 - add;

  if (n > max) {
    return this.generate(max) + this.generate(n - max);
  }

  max = Math.pow(10, n + add);
  const min = max / 10;
  const number = Math.floor(Math.random() * (max - min + 1)) + min;

  return `${number}`.substring(add);
};
