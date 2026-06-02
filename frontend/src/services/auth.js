import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

let _userManager = null

/** Khởi tạo OIDC client từ runtime config. Gọi 1 lần trong main.jsx. */
export function configureAuth({ issuer, clientId, scope }) {
  const origin = window.location.origin
  _userManager = new UserManager({
    authority: issuer,
    client_id: clientId,
    redirect_uri: `${origin}/auth/callback`,
    post_logout_redirect_uri: origin,
    response_type: 'code',
    scope: scope || 'openid profile',
    loadUserInfo: false,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    automaticSilentRenew: true,
  })

  // Refresh fail (vd SSO session invalid, "Session doesn't have required client")
  // → xóa user state cục bộ và đẩy về login. Không để UX kẹt trang trắng.
  _userManager.events.addSilentRenewError((err) => {
    console.warn('[oidc] silent renew failed → re-login', err?.message || err)
    _userManager.removeUser().finally(() => {
      window.location.href = '/login?reason=session-invalid'
    })
  })
  _userManager.events.addAccessTokenExpired(() => {
    console.warn('[oidc] access token expired → re-login')
    _userManager.removeUser().finally(() => {
      window.location.href = '/login?reason=expired'
    })
  })
}

function um() {
  if (!_userManager) throw new Error('authService chưa được configure. main.jsx phải gọi configureAuth() trước.')
  return _userManager
}

export const authService = {
  get userManager() { return um() },
  login: () => um().signinRedirect(),
  handleCallback: () => um().signinRedirectCallback(),
  logout: () => um().signoutRedirect(),
  getUser: () => um().getUser(),
  removeUser: () => um().removeUser(),
}
