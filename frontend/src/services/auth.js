import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

const origin = window.location.origin

const userManager = new UserManager({
  authority: import.meta.env.VITE_OIDC_ISSUER,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: `${origin}/auth/callback`,
  post_logout_redirect_uri: origin,
  response_type: 'code',
  scope: import.meta.env.VITE_OIDC_SCOPE || 'openid profile',
  loadUserInfo: false,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
})

export const authService = {
  userManager,
  login: () => userManager.signinRedirect(),
  handleCallback: () => userManager.signinRedirectCallback(),
  logout: () => userManager.signoutRedirect(),
  getUser: () => userManager.getUser(),
  removeUser: () => userManager.removeUser(),
}
