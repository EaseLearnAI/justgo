/**
 * 位置获取工具函数
 * 使用浏览器定位 API 获取用户位置
 */

export interface LocationInfo {
  lat: number
  lng: number
  city?: string
  accuracy?: number
}

/**
 * 获取用户当前位置
 * @param options 定位选项
 * @returns Promise<LocationInfo> 位置信息
 */
export const getCurrentLocation = (options?: PositionOptions): Promise<LocationInfo> => {
  return new Promise((resolve, reject) => {
    // 检查浏览器是否支持定位
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位功能'))
      return
    }

    console.log('📍 开始获取用户位置...')

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,  // 使用高精度定位
      timeout: 10000,           // 超时时间 10 秒
      maximumAge: 0             // 不使用缓存，获取最新位置
    }

    const finalOptions = { ...defaultOptions, ...options }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationInfo = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }

        console.log('✅ 位置获取成功:', location)
        console.log('   精度:', position.coords.accuracy, '米')

        resolve(location)
      },
      (error) => {
        let errorMessage = '定位失败'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '用户拒绝了定位请求，请在浏览器设置中允许位置权限'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用，请检查 GPS 是否开启'
            break
          case error.TIMEOUT:
            errorMessage = '定位请求超时，请重试'
            break
          default:
            errorMessage = `定位失败: ${error.message}`
            break
        }

        console.error('❌ 位置获取失败:', errorMessage)
        reject(new Error(errorMessage))
      },
      finalOptions
    )
  })
}

/**
 * 使用高德地图 JS API 获取位置（如果已集成高德地图）
 * @returns Promise<LocationInfo> 位置信息
 */
export const getCurrentLocationByAmap = (): Promise<LocationInfo> => {
  return new Promise((resolve, reject) => {
    // 检查是否加载了高德地图
    if (typeof window === 'undefined' || !(window as any).AMap) {
      reject(new Error('高德地图未加载，请先加载高德地图 JS API'))
      return
    }

    const AMap = (window as any).AMap

    AMap.plugin('AMap.Geolocation', function() {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        zoomToAccuracy: false
      })

      geolocation.getCurrentPosition(function(status: string, result: any) {
        if (status === 'complete') {
          const location: LocationInfo = {
            lat: result.position.lat,
            lng: result.position.lng,
            city: result.addressComponent?.city,
            accuracy: result.accuracy
          }

          console.log('✅ 高德地图定位成功:', location)
          resolve(location)
        } else {
          console.error('❌ 高德地图定位失败:', result)
          reject(new Error(result.message || '高德地图定位失败'))
        }
      })
    })
  })
}

/**
 * 获取位置信息（自动选择最佳方式）
 * 优先使用浏览器定位，如果失败则尝试高德地图定位
 * @returns Promise<LocationInfo> 位置信息
 */
export const getLocation = async (): Promise<LocationInfo> => {
  try {
    // 优先使用浏览器定位
    return await getCurrentLocation()
  } catch (error) {
    console.warn('⚠️ 浏览器定位失败，尝试使用高德地图定位:', error)
    
    try {
      // 如果浏览器定位失败，尝试使用高德地图定位
      return await getCurrentLocationByAmap()
    } catch (amapError) {
      console.error('❌ 高德地图定位也失败:', amapError)
      throw new Error('所有定位方式都失败，请检查定位权限和网络连接')
    }
  }
}

