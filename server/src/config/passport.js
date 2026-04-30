"use strict";

const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;

const env = require("./env");
const userModel = require("../models/user.model");
const platformModel = require("../models/platform.model");
const { encrypt } = require("../utils/crypto");
const logger = require("../utils/logger");

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
        scope: ["read:user", "user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const primaryEmail =
            profile.emails?.find((e) => e.primary)?.value ||
            profile.emails?.[0]?.value ||
            null;

          const user = await userModel.upsertFromGithub({
            githubId: Number(profile.id),
            username: profile.username,
            name: profile._json?.name || profile.displayName || null,
            avatarUrl: profile._json?.avatar_url || profile.photos?.[0]?.value,
            email: primaryEmail,
            bio: profile._json?.bio || null,
          });

          // Store the OAuth access token encrypted so the GitHub service
          // can make authenticated calls (contributions, commit search, etc.)
          let encryptedToken = null;
          try {
            encryptedToken = encrypt(accessToken);
          } catch (err) {
            logger.warn("Could not encrypt GitHub access token", { error: err.message });
          }

          await platformModel.upsertPlatform({
            userId: user.id,
            platformName: "github",
            platformUsername: profile.username,
            apiKey: encryptedToken,
            status: "pending",
          });

          return done(null, user);
        } catch (err) {
          logger.error("GitHub OAuth strategy failed", { error: err.message });
          return done(err);
        }
      }
    )
  );
} else {
  logger.warn("GitHub OAuth not configured (missing CLIENT_ID/SECRET)");
}

module.exports = passport;
