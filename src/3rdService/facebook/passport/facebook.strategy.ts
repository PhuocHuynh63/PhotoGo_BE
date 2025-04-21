// filepath: /Users/kumo/Desktop/EXE2/PhotoGo_BE/src/3rdService/facebook/facebook.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_REDIRECT_URI,
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
    const { id, emails, name, photos } = profile;
    return {
      facebookId: id,
      email: emails[0]?.value,
      firstName: name?.givenName,
      lastName: name?.familyName,
      avatar: photos[0]?.value,
    };
  }
}