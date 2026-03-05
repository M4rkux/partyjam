declare global {
  namespace App {
    interface Error {
      message: string;
    }
    interface Locals {
      user: {
        id: string;
        spotifyId: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    }
    interface PageData {}
    interface PageState {}
    interface Platform {}
  }
}

export {};
