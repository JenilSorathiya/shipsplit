const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/User.model');

// ── JWT Strategy ──────────────────────────────────────────────────────
passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  },
  async (payload, done) => {
    try {
      const user = await User.findById(payload.sub);
      if (!user || !user.isActive) return done(null, false);
      return done(null, user);
    } catch (err) { return done(err, false); }
  }
));

// ── Google OAuth Strategy (only if credentials are configured) ────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), null);

        let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

        if (!user) {
          user = await User.create({
            googleId:        profile.id,
            name:            profile.displayName,
            email,
            avatar:          profile.photos?.[0]?.value,
            isEmailVerified: true,
          });
        } else if (!user.googleId) {
          user.googleId = profile.id;
          user.isEmailVerified = true;
          if (!user.avatar) user.avatar = profile.photos?.[0]?.value;
          await user.save({ validateBeforeSave: false });
        }

        return done(null, user);
      } catch (err) { return done(err, null); }
    }
  ));
}
