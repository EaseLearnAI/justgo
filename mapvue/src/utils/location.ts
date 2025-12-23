/**
 * 位置获取工具函数
 * 支持多种定位方式：
 * 1. 高德地图 JS API 定位（高精度，HTTPS 下可用）
 * 2. 浏览器定位 API
 * 3. 后端 IP 定位（回退方案）
 */

import { API_BASE_URL } from '@/api/config'

// 声明高德地图类型
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: any
  }
}

export interface LocationInfo {
  lat: number
  lng: number
  city?: string
  province?: string
  address?: string
  accuracy?: number
  source?: string
}

/**
 * 控制台日志输出（带样式）
 */
const logLocation = (type: 'info' | 'success' | 'error' | 'warn', message: string, data?: any) => {
  const styles = {
    info: 'color: #2196F3; font-weight: bold;',
    success: 'color: #4CAF50; font-weight: bold;',
    error: 'color: #F44336; font-weight: bold;',
    warn: 'color: #FF9800; font-weight: bold;'
  }
  const icons = {
    info: '📍',
    success: '✅',
    error: '❌',
    warn: '⚠️'
  }
  
  const prefix = `${icons[type]} [位置服务]`
  
  if (data !== undefined) {
    console.log(`%c${prefix} ${message}`, styles[type], data)
  } else {
    console.log(`%c${prefix} ${message}`, styles[type])
  }
}

/**
 * 获取用户当前位置（浏览器定位 API）
 * @param options 定位选项
 * @returns Promise<LocationInfo> 位置信息
 */
export const getCurrentLocation = (options?: PositionOptions): Promise<LocationInfo> => {
  return new Promise((resolve, reject) => {
    // 检查浏览器是否支持定位
    if (!navigator.geolocation) {
      logLocation('error', '浏览器不支持定位功能')
      reject(new Error('浏览器不支持定位功能'))
      return
    }

    logLocation('info', '开始获取浏览器定位...')

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
          accuracy: position.coords.accuracy,
          source: 'browser'
        }

        logLocation('success', '浏览器定位成功', {
          '经度': location.lng,
          '纬度': location.lat,
          '精度': `${position.coords.accuracy} 米`
        })

        resolve(location)
      },
      (error) => {
        let errorMessage = '定位失败'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '用户拒绝了定位请求，将尝试使用IP定位'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用，将尝试使用IP定位'
            break
          case error.TIMEOUT:
            errorMessage = '定位请求超时，将尝试使用IP定位'
            break
          default:
            errorMessage = `定位失败: ${error.message}`
            break
        }

        logLocation('warn', errorMessage)
        reject(new Error(errorMessage))
      },
      finalOptions
    )
  })
}

/**
 * 通过后端 IP 定位获取位置
 * @returns Promise<LocationInfo> 位置信息
 */
export const getLocationByIP = async (): Promise<LocationInfo> => {
  logLocation('info', '开始 IP 定位...')
  
  try {
    // 使用相对路径，支持域名和IP访问
    const apiUrl = API_BASE_URL.startsWith('/') 
      ? '/api/route/ip-location' 
      : `${API_BASE_URL.replace('/api', '')}/api/route/ip-location`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      const location: LocationInfo = {
        lat: data.data.lat,
        lng: data.data.lng,
        city: data.data.city,
        province: data.data.province,
        address: data.data.address,
        source: data.data.source
      }
      
      logLocation('success', 'IP定位成功', {
        '城市': location.city,
        '省份': location.province,
        '经度': location.lng,
        '纬度': location.lat,
        '来源': location.source,
        '客户端IP': data.data.clientIP
      })
      
      return location
    } else {
      throw new Error(data.message || 'IP定位失败')
    }
  } catch (error: any) {
    logLocation('error', 'IP定位请求失败', error.message)
    throw error
  }
}

/**
 * 使用高德地图 JS API 获取位置（高精度）
 * 这是首选的定位方法，HTTPS 下可用
 * @returns Promise<LocationInfo> 位置信息
 */
export const getCurrentLocationByAmap = (): Promise<LocationInfo> => {
  return new Promise((resolve, reject) => {
    // 检查是否加载了高德地图
    if (typeof window === 'undefined' || !window.AMap) {
      logLocation('warn', '高德地图未加载，尝试加载...')
      // 尝试动态加载
      loadAmapScript()
        .then(() => {
          doAmapGeolocation(resolve, reject)
        })
        .catch(reject)
      return
    }

    doAmapGeolocation(resolve, reject)
  })
}

/**
 * 动态加载高德地图脚本
 */
const loadAmapScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=8675340586e27a73c7b6178e64f37583&plugin=AMap.Geolocation,AMap.CitySearch'
    script.onload = () => {
      logLocation('success', '高德地图脚本加载成功')
      resolve()
    }
    script.onerror = () => {
      reject(new Error('高德地图脚本加载失败'))
    }
    document.head.appendChild(script)
  })
}

/**
 * 执行高德地图定位
 */
const doAmapGeolocation = (resolve: (value: LocationInfo) => void, reject: (reason?: any) => void) => {
  const AMap = window.AMap
  
  logLocation('info', '开始高德地图高精度定位...')
  
  AMap.plugin('AMap.Geolocation', function() {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,  // 使用高精度定位
      timeout: 15000,            // 超时时间 15 秒
      maximumAge: 0,             // 不使用缓存
      convert: true,             // 坐标转换为高德坐标
      showButton: false,
      showMarker: false,
      showCircle: false,
      panToLocation: false,
      GeoLocationFirst: true,    // 优先使用浏览器定位
    })

    geolocation.getCurrentPosition(function(status: string, result: any) {
      if (status === 'complete' && result.position) {
        const location: LocationInfo = {
          lat: result.position.lat,
          lng: result.position.lng,
          city: result.addressComponent?.city || result.addressComponent?.district,
          province: result.addressComponent?.province,
          address: result.formattedAddress,
          accuracy: result.accuracy,
          source: 'amap_geolocation'
        }

        logLocation('success', '高德地图高精度定位成功', {
          '经度': location.lng,
          '纬度': location.lat,
          '城市': location.city,
          '精度': `${result.accuracy} 米`,
          '地址': location.address
        })

        resolve(location)
      } else {
        logLocation('warn', '高德地图高精度定位失败，尝试城市定位...', result.message)
        // 回退到城市定位
        getAmapCityLocation()
          .then(resolve)
          .catch(reject)
      }
    })
  })
}

/**
 * 使用高德 CitySearch 获取城市级别定位
 */
const getAmapCityLocation = (): Promise<LocationInfo> => {
  return new Promise((resolve, reject) => {
    const AMap = window.AMap
    
    logLocation('info', '开始高德地图城市定位...')
    
    AMap.plugin('AMap.CitySearch', function() {
      const citySearch = new AMap.CitySearch()
      citySearch.getLocalCity(function(status: string, result: any) {
        if (status === 'complete' && result.info === 'OK') {
          // 城市定位成功，但只有城市信息，需要获取城市中心坐标
          const bounds = result.bounds
          let centerLat = 0
          let centerLng = 0
          
          if (bounds) {
            // 计算边界的中心点
            const ne = bounds.getNorthEast()
            const sw = bounds.getSouthWest()
            centerLat = (ne.lat + sw.lat) / 2
            centerLng = (ne.lng + sw.lng) / 2
          } else if (result.rectangle) {
            // 从 rectangle 字符串解析
            const coords = result.rectangle.split(';')
            if (coords.length >= 2) {
              const sw = coords[0].split(',')
              const ne = coords[1].split(',')
              centerLng = (parseFloat(sw[0]) + parseFloat(ne[0])) / 2
              centerLat = (parseFloat(sw[1]) + parseFloat(ne[1])) / 2
            }
          }
          
          const location: LocationInfo = {
            lat: centerLat,
            lng: centerLng,
            city: result.city,
            province: result.province,
            source: 'amap_city'
          }

          logLocation('success', '高德地图城市定位成功', {
            '城市': location.city,
            '省份': location.province,
            '经度': location.lng,
            '纬度': location.lat
          })

          resolve(location)
        } else {
          logLocation('error', '高德地图城市定位失败', result)
          reject(new Error(result.info || '城市定位失败'))
        }
      })
    })
  })
}

/**
 * 获取位置信息（自动选择最佳方式）
 * 优先级：高德地图定位（高精度） > 浏览器定位 > IP定位
 * @returns Promise<LocationInfo> 位置信息
 */
export const getLocation = async (): Promise<LocationInfo> => {
  logLocation('info', '开始获取用户位置（HTTPS 环境，优先使用高德地图定位）...')
  
  // 1. 优先尝试高德地图高精度定位（HTTPS 下最稳定）
  try {
    const location = await getCurrentLocationByAmap()
    logLocation('success', '✅ 最终使用高德地图定位结果')
    return location
  } catch (amapError) {
    logLocation('warn', '高德地图定位失败，尝试浏览器定位...', (amapError as Error).message)
  }
  
  // 2. 尝试浏览器定位
  try {
    const location = await getCurrentLocation()
    logLocation('success', '✅ 最终使用浏览器定位结果')
    return location
  } catch (browserError) {
    logLocation('warn', '浏览器定位失败，回退到IP定位...', (browserError as Error).message)
  }
  
  // 3. 回退到 IP 定位
  try {
    const location = await getLocationByIP()
    logLocation('success', '✅ 最终使用IP定位结果')
    return location
  } catch (ipError) {
    logLocation('error', '所有定位方式均失败', (ipError as Error).message)
    
    // 返回默认位置（北京）
    const defaultLocation: LocationInfo = {
      lat: 39.908823,
      lng: 116.397470,
      city: '北京',
      source: 'default'
    }
    
    logLocation('info', '使用默认位置（北京）', defaultLocation)
    return defaultLocation
  }
}
