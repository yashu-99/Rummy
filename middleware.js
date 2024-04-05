import jwt from "jsonwebtoken";
// module.exports.storeReturnTo = (req, res, next) => {
//   if (req.session.returnTo) {
//     res.locals.returnTo = req.session.returnTo;
//   }
//   next();
// };

function checkUserToken(token) {
  if (!token) {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, "secretstring", (err, user) => {
      if (err) {
        console.log(err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}
async function getUserId(token) {
  if (!token) {
    return null;
  }
  try {
    const user = await new Promise((resolve, reject) => {
      jwt.verify(token, "secretstring", (err, user) => {
        if (err) {
          console.log(err);
          reject(null);
        } else {
          resolve(user);
        }
      });
    });
    return user.id;
  } catch (err) {
    console.log(err);
    return null;
  }
}
export { checkUserToken, getUserId };
