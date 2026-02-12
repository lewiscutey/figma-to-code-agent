import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

/**
 * Simple file-based cache for Figma API responses
 * Reduces API calls and avoids rate limiting
 */
export class FigmaCache {
  private cacheDir: string

  constructor(cacheDir = '.figma-cache') {
    this.cacheDir = path.resolve(process.cwd(), cacheDir)
    this.ensureCacheDir()
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private getCacheKey(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex')
  }

  private getCachePath(key: string): string {
    const hash = this.getCacheKey(key)
    return path.join(this.cacheDir, `${hash}.json`)
  }

  /**
   * Get cached data if exists and not expired
   */
  get<T>(key: string, maxAge?: number): T | null {
    const cachePath = this.getCachePath(key)

    if (!fs.existsSync(cachePath)) {
      return null
    }

    try {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
      
      // Check expiration
      if (maxAge && data.timestamp) {
        const age = Date.now() - data.timestamp
        if (age > maxAge) {
          this.delete(key)
          return null
        }
      }

      return data.value
    } catch (error) {
      // Invalid cache, delete it
      this.delete(key)
      return null
    }
  }

  /**
   * Set cache data
   */
  set<T>(key: string, value: T): void {
    const cachePath = this.getCachePath(key)
    const data = {
      timestamp: Date.now(),
      value,
    }

    fs.writeFileSync(cachePath, JSON.stringify(data), 'utf-8')
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    const cachePath = this.getCachePath(key)
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath)
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir)
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file))
      }
    }
  }
}
