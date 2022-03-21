const { User, UniversalEvent } = require('@wallfair.io/wallfair-commons').models;
const mongoose = require('mongoose');
const moment = require('moment');

const getList = async (type, limit, skip) => {
  let result;

  const dates = {
    start: moment().startOf('day').toDate(),
    end: moment().endOf('day').toDate()
  };

  switch (type) {
    case 'high_events':
      result = await getHighEvents(limit, skip, dates);
      break;
    case 'high_games':
      result = await getHighGames(limit, skip, dates);
      break;
    case 'high_volume':
      result = await getHighVolume(limit, skip, dates);
      break;
    case 'jackpot_winners':
      result = await getJackpotWinners();
      break;
    default:
      result = await getOverall(limit, skip);
      break;
  }

  return {
    ...(result.users.length ? result : { users: [], total: 0 }),
    limit,
    skip
  }
}

const getJackpotWinners = async () => {
  const yesterdayDates = {
    start: moment().startOf('day').subtract(1, 'days').toDate(),
    end: moment().endOf('day').subtract(1, 'days').toDate()
  };

  const highEventsWinner = await getHighEvents(1, 0, yesterdayDates);
  const highGamesWinner = await getHighGames(1, 0, yesterdayDates);
  const highVolumeWinner = await getHighVolume(1, 0, yesterdayDates);

  return {
    total: 3,
    users: [
      ...highEventsWinner.users,
      ...highGamesWinner.users,
      ...highVolumeWinner.users
    ]
  }
}

const getHighEvents = async (limit, skip, dates) => {
  const res = await UniversalEvent.aggregate([
    {
      $match: {
        type: {
          $in: [
            'Notification/EVENT_USER_REWARD', 'Notification/EVENT_BET_CASHED_OUT'
          ]
        },
        createdAt: {
          $gte: dates.start,
          $lte: dates.end
        }
      }
    }, {
      $addFields: {
        profilePicture: '$data.user.profilePicture',
        username: '$data.user.username'
      }
    }, {
      $group: {
        _id: '$data.user._id',
        winReward: {
          $sum: {
            $cond: [
              {
                $gt: ['$data.gainAmount', 0]
              },
              '$data.gainAmount', 0
            ]
          }
        },
        winCashout: {
          $sum: {
            $cond: [
              {
                $gt: ['$data.gain.gainAmount', 0]
              },
              '$data.gain.gainAmount', 0
            ]
          },
        },
        tmp: {
          $push: {
            profilePicture: '$data.user.profilePicture',
            username: '$data.user.username'
          }
        }
      }
    }, {
      $project: {
        amountWon: {
          $add: [
            '$winReward', '$winCashout'
          ]
        },
        profilePicture: {
          $first: '$tmp.profilePicture'
        },
        username: {
          $first: '$tmp.username'
        }
      }
    },
    {
      $redact: {
        $cond: {
          if: {
            $lte: [
              '$amountWon', 0
            ]
          },
          then: '$$PRUNE',
          else: '$$DESCEND'
        }
      }
    },
    {
      $sort: {
        amountWon: -1
      }
    }, {
      $facet: {
        total: [
          {
            $group: {
              _id: null,
              count: {
                $sum: 1
              }
            }
          }
        ],
        users: [
          {
            $skip: skip
          }, {
            $limit: limit
          }, {
            $project: {
              _id: 1,
              amountWon: 1,
              profilePicture: 1,
              username: 1
            }
          }
        ]
      }
    }, {
      $unwind: '$total'
    }, {
      $project: {
        total: '$total.count',
        users: '$users'
      }
    }
  ]).catch((err) => {
    console.error(err);
  });

  return res[0] || { users: [], total: 0 };
}

const getHighGames = async (limit, skip, dates) => {
  const res = await UniversalEvent.aggregate([
    {
      $match: {
        type: 'Casino/CASINO_CASHOUT',
        createdAt: {
          $gte: dates.start,
          $lte: dates.end
        }
      }
    }, {
      $addFields: {
        profilePicture: '$data.profilePicture',
        username: '$data.username'
      }
    }, {
      $group: {
        _id: '$data.userId',
        winReward: {
          $sum: '$data.profit'
        },
        tmp: {
          $push: {
            profilePicture: '$data.profilePicture',
            username: '$data.username'
          }
        }
      }
    }, {
      $project: {
        amountWon: '$winReward',
        profilePicture: {
          $first: '$tmp.profilePicture'
        },
        username: {
          $first: '$tmp.username'
        }
      }
    }, {
      $sort: {
        amountWon: -1
      }
    }, {
      $facet: {
        total: [
          {
            $group: {
              _id: null,
              count: {
                $sum: 1
              }
            }
          }
        ],
        users: [
          {
            $skip: skip
          }, {
            $limit: limit
          }, {
            $project: {
              _id: 1,
              amountWon: 1,
              profilePicture: 1,
              username: 1
            }
          }
        ]
      }
    }, {
      $unwind: '$total'
    }, {
      $project: {
        total: '$total.count',
        users: '$users'
      }
    }
  ]).catch((err) => {
    console.error(err);
  });

  return res[0] || { users: [], total: 0 };
}

const getHighVolume = async (limit, skip, dates) => {
  const res = await UniversalEvent.aggregate([
    {
      $match: {
        type: 'Notification/EVENT_BET_PLACED',
        createdAt: {
          $gte: dates.start,
          $lte: dates.end
        },
        'data.creator.admin': false
      }
    }, {
      $group: {
        _id: '$data.bet.creator',
        amountWon: {
          $sum: '$data.trade.investment_amount'
        }
      }
    }, {
      $sort: {
        amountWon: -1
      }
    }, {
      $facet: {
        total: [
          {
            $group: {
              _id: null,
              count: {
                $sum: 1
              }
            }
          }
        ],
        users: [
          {
            $skip: skip
          }, {
            $limit: limit
          }, {
            $project: {
              _id: 1,
              amountWon: 1,
            }
          }
        ]
      }
    }, {
      $unwind: '$total'
    }, {
      $project: {
        total: '$total.count',
        users: '$users'
      }
    }
  ]).catch((err) => {
    console.error(err);
  });

  let infos = [];

  if (res[0] && res[0].users.length) {
    infos = await User.find({
      _id: {
        $in: res[0].users.map(user => {
          return mongoose.Types.ObjectId(user._id);
        })
      }
    })
      .select({ username: 1, profilePicture: 1 })
      .exec();
  }

  return !res[0] ? { users: [], total: 0 } : {
    users: res[0].users.map(v => {
      const info = infos.find(s => s._id.toString() === v._id);
      return { ...v, ...(info && info._doc) }
    }),
    total: res[0].total
  };
}

const getOverall = async (limit, skip) => {
  const users = await User.find({ username: { $exists: true } })
    .sort({ amountWon: -1, date: -1 })
    .select({ username: 1, amountWon: 1, profilePicture: 1 })
    .limit(limit)
    .skip(skip)
    .exec();

  const total = await User.countDocuments().exec();

  return {
    total,
    users,
  };
}

module.exports = {
  getList
};
