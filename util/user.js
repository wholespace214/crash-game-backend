exports.isUserBanned = (user) => {
  if (!user) {
    throw new Error('No user provided.');
  }

  if (user.status !== 'banned') {
    return false;
  }

  if (user.reactivateOn !== null && user.reactivateOn > new Date()) {
    return true;
  }

  user.status = 'active';
  user.reactivateOn = null;
  user.statusDescription = null;

  user.save();

  return false;
};

exports.getBanData = (user) => {
  return ['reactivateOn', 'statusDescription', 'status', 'username'].reduce(
    (acc, key) => ({ ...acc, [key]: user[key] }),
    {}
  );
};
