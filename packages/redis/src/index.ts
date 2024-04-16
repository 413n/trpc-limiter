import {
  AnyRootConfig,
  BaseOpts,
  defineLimiterWithProps,
} from '@trpc-limiter/core'
import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
  IRateLimiterStoreOptions,
} from 'rate-limiter-flexible'

export const createTrpcRedisLimiter = defineLimiterWithProps<{
  redisClient: IRateLimiterStoreOptions['storeClient']
  limiter?: (
    opts: Required<BaseOpts<AnyRootConfig, any>>
  ) => IRateLimiterStoreOptions['insuranceLimiter']
}>(
  {
    store: (opts) => {
      return new RateLimiterRedis({
        storeClient: opts.redisClient,
        keyPrefix: 'RATE_LIMIT',
        points: opts.max,
        duration: opts.windowMs / 1000, // in seconds
        insuranceLimiter: opts.limiter(opts),
      })
    },
    async isBlocked(store, fingerprint) {
      try {
        await store.consume(fingerprint)
        return null
      } catch (error) {
        if (error instanceof RateLimiterRes) {
          return Math.round(error.msBeforeNext / 1000) || 1
        }
        // Should not happen with `insuranceLimiter`
        throw error
      }
    },
  },
  (currentState) => {
    return {
      redisClient: currentState.redisClient,
      limiter:
        currentState.limiter ??
        (() =>
          new RateLimiterMemory({
            points: currentState.max,
            duration: currentState.windowMs / 1000, // in seconds
          })),
    }
  }
)

export * from 'rate-limiter-flexible'
export { defaultFingerPrint } from '@trpc-limiter/core'
