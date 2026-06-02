import api from './api'

const BASE = '/api/v2/bond'

export const bondService = {
  getBondPage: (params) => api.get(`${BASE}/GetBondPage`, { params }).then((r) => r.data),
  getBondFilter: () => api.get(`${BASE}/GetBondFilter`).then((r) => r.data),
  getBondInfo: (params) => api.get(`${BASE}/GetBondInfo`, { params }).then((r) => r.data),
  setBondInfoDraft: (body, { changed } = {}) =>
    api.post(`${BASE}/SetBondInfoDraft`, body, { params: changed ? { changed } : {} }).then((r) => r.data),
  setBondInfo: (body) => api.post(`${BASE}/SetBondInfo`, body).then((r) => r.data),
  deleteBondInfo: (oid) => api.post(`${BASE}/DeleteBondInfo`, { Oid: oid }).then((r) => r.data),
}
