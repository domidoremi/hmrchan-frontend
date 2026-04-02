import {
  CACHE_NAMES,
  isApiRequest,
  isAuthorRequest,
  isAvatarRequest,
  isMediaRequest,
  isPostDetailRequest,
  isPostListRequest,
  isStaticAsset,
  isVideoStreamRequest,
  shouldHandleRequest,
} from './runtime'
import type { FetchEventLike } from './types'
import {
  cacheFirst,
  cacheFirstMedia,
  handleNavigationRequest,
  networkFirstApi,
  networkOnly,
  staleWhileRevalidatePost,
} from './strategies'

export function handleFetch(event: FetchEventLike): void {
  const { request } = event
  const url = new URL(request.url)

  if (!shouldHandleRequest(url)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static))
  } else if (isVideoStreamRequest(url)) {
    event.respondWith(fetch(request))
  } else if (isAvatarRequest(url)) {
    event.respondWith(cacheFirstMedia(request))
  } else if (isMediaRequest(url)) {
    event.respondWith(cacheFirstMedia(request))
  } else if (isPostDetailRequest(url)) {
    event.respondWith(staleWhileRevalidatePost(request))
  } else if (isPostListRequest(url)) {
    event.respondWith(networkFirstApi(request))
  } else if (isAuthorRequest(url)) {
    event.respondWith(staleWhileRevalidatePost(request))
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirstApi(request))
  } else {
    event.respondWith(networkOnly(request))
  }
}
