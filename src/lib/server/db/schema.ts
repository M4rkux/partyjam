import { pgTable, text, uuid, timestamp, char, jsonb } from 'drizzle-orm/pg-core';
import type { ShareSettings } from '../../types';
import { defaultShareSettings } from '../../types';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  spotifyId: text('spotify_id').unique().notNull(),
  username: text('username').unique().notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
  passcode: char('passcode', { length: 6 }).notNull(),
  shareSettings: jsonb('share_settings')
    .$type<ShareSettings>()
    .notNull()
    .default(defaultShareSettings),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const queueAdditions = pgTable('queue_additions', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  visitorId: text('visitor_id').notNull(),
  trackId: text('track_id').notNull(),
  trackName: text('track_name').notNull(),
  trackArtist: text('track_artist').notNull(),
  trackUri: text('track_uri').notNull(),
  trackImageUrl: text('track_image_url'),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  removedAt: timestamp('removed_at', { withTimezone: true })
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type QueueAddition = typeof queueAdditions.$inferSelect;
