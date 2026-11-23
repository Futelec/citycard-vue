/**
 * 金币技能：四面楚歌
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteSiMianChuGe(gameStore) {
  return function executeSiMianChuGe(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '四面楚歌')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '四面楚歌',
        `${caster.name}使用四面楚歌，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了四面楚歌`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('四面楚歌', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }


    // 省会城市列表
    const CAPITAL_CITIES = [
      '石家庄', '太原', '呼和浩特', '沈阳', '长春', '哈尔滨',
      '南京', '杭州', '合肥', '福州', '南昌', '济南', '郑州',
      '武汉', '长沙', '广州', '南宁', '海口', '成都', '贵阳',
      '昆明', '拉萨', '西安', '兰州', '西宁', '银川', '乌鲁木齐'
    ]

    // 计划单列市
    const PLAN_CITIES = ['大连', '青岛', '深圳', '厦门', '宁波']

    // 直辖市
    const MUNICIPALITIES = ['北京', '上海', '天津', '重庆']

    // 获取有效城市名称（考虑狐假虎威伪装）
    const getEffectiveName = (playerName, cityKey) => {
      const disguise = gameStore.disguisedCities &&
                      gameStore.disguisedCities[playerName] &&
                      gameStore.disguisedCities[playerName][cityKey]
      if (disguise && disguise.roundsLeft > 0) {
        return disguise.disguiseAsName || gameStore.players.find(p => p.name === playerName).cities[cityKey].name
      }
      const player = gameStore.players.find(p => p.name === playerName)
      return player.cities[cityKey].name
    }

    // 判断是否为特殊城市
    const isCapitalCity = (cityName) => {
      const cleanName = cityName.replace(/(市|县|区)$/g, '')
      return CAPITAL_CITIES.some(cap => cleanName.includes(cap) || cap.includes(cleanName))
    }

    const isPlanCity = (cityName) => {
      const cleanName = cityName.replace(/(市|县|区)$/g, '')
      return PLAN_CITIES.some(plan => cleanName.includes(plan) || plan.includes(cleanName))
    }

    const isMunicipality = (cityName) => {
      const cleanName = cityName.replace(/(市|县|区)$/g, '')
      return MUNICIPALITIES.some(mun => cleanName.includes(mun) || mun.includes(cleanName))
    }

    const isSpecialAdministrativeRegion = (cityName) => {
      return cityName.includes('香港') || cityName.includes('澳门')
    }

    // 获取城市所属省份（考虑拔旗易帜）
    const getCityProvince = (playerName, cityKey, cityName) => {
      // 检查拔旗易帜标记
      if (gameStore.changeFlagMark &&
          gameStore.changeFlagMark[playerName] &&
          gameStore.changeFlagMark[playerName][cityKey]) {
        return gameStore.changeFlagMark[playerName][cityKey].newProvince
      }

      // 直辖市和特区使用城市名本身作为省份
      if (isMunicipality(cityName) || isSpecialAdministrativeRegion(cityName)) {
        const cleanName = cityName.replace(/(市|县|区)$/g, '')
        if (MUNICIPALITIES.includes(cleanName)) {
          return cleanName + '市'
        }
        if (cityName.includes('香港')) return '香港特别行政区'
        if (cityName.includes('澳门')) return '澳门特别行政区'
      }

      // 优先使用城市对象自带的province属性
      const player = gameStore.players.find(p => p.name === playerName)
      if (player && player.cities[cityKey] && player.cities[cityKey].province) {
        return player.cities[cityKey].province
      }

      // 使用PROVINCE_MAP作为后备
      return PROVINCE_MAP[cityName]?.name || null
    }

    // 获取己方所有存活城市的省份集合
    const myProvinces = new Set()
    Object.entries(caster.cities).forEach(([ci, city]) => {
      const casterHp = city ? (city.currentHp !== undefined ? city.currentHp : city.hp) : 0
      if (city && casterHp > 0 && city.isAlive !== false) {
        const effectiveName = getEffectiveName(caster.name, ci)
        const prov = getCityProvince(caster.name, ci, effectiveName)
        if (prov) {
          myProvinces.add(prov)
        }
      }
    })

    if (myProvinces.size === 0) {
      // 返还金币
      caster.gold += SKILL_COSTS['四面楚歌']
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '四面楚歌',
        `${caster.name}使用四面楚歌，但没有可用的省份！金币已返还`,
        `${caster.name}使用了四面楚歌`
      )
      return {
        success: false,
        message: '你没有可用的城市！金币已返还'
      }
    }

    // 确定是否有中心城市概念（仅2P和2v2）
    const gameMode = gameStore.gameMode || '2P'
    const hasCenterCity = (gameMode === '2P' || gameMode === '2v2')
    const oppCenterName = hasCenterCity ? target.centerCityName : null

    const transferredCities = []
    const halvedCities = []
    const exposedFoxCities = []

    // 第一阶段：检查与己方同省的城市，非特殊城市归顺
    const citiesToRemove = []
    for (const [ci, city] of Object.entries(target.cities)) {
      if (!city) continue
      const hp1 = city.currentHp !== undefined ? city.currentHp : city.hp
      if (hp1 <= 0 || city.isAlive === false) continue
      if (hasCenterCity && ci === oppCenterName) continue

      const effectiveName = getEffectiveName(target.name, ci)
      const isSpecial = isCapitalCity(effectiveName) ||
                       isPlanCity(effectiveName) ||
                       isMunicipality(effectiveName) ||
                       isSpecialAdministrativeRegion(effectiveName)

      // 特殊城市不归顺
      if (isSpecial) continue

      // 获取省份（考虑拔旗易帜）
      const prov = getCityProvince(target.name, ci, effectiveName)

      // 只有与己方同省的城市才归顺
      if (!prov || !myProvinces.has(prov)) continue

      // 检查是否有步步高升状态（免疫四面楚歌）
      if (gameStore.bbgs &&
          gameStore.bbgs[target.name] &&
          gameStore.bbgs[target.name][ci]) {
        addSkillEffectLog(gameStore, `${target.name}的${effectiveName}有步步高升状态，免疫四面楚歌`)
        continue
      }

      // 检查是否是伪装城市
      const disguise = gameStore.disguisedCities &&
                      gameStore.disguisedCities[target.name] &&
                      gameStore.disguisedCities[target.name][ci]

      if (disguise && disguise.roundsLeft > 0) {
        // 伪装城市：自毁并识破
        const currentHp = city.currentHp || city.hp
        city.currentHp = 0
        city.isAlive = false
        disguise.roundsLeft = 0
        exposedFoxCities.push({
          name: `${disguise.disguiseAsName}（实为${city.name}，狐假虎威被识破并自毁）`
        })
      } else {
        // 普通城市：正常归顺
        transferredCities.push({
          cityObj: JSON.parse(JSON.stringify(city)),
          originalCityName: ci
        })
        citiesToRemove.push(ci)
      }
    }

    // 保存被转移城市的initialCities数据（在删除之前）
    const transferredInitialCities = []
    for (const item of transferredCities) {
      let initialCity = null
      if (gameStore.initialCities && gameStore.initialCities[target.name]) {
        initialCity = gameStore.initialCities[target.name][item.originalCityName]
      }
      transferredInitialCities.push(initialCity || { name: item.cityObj.name, hp: item.cityObj.hp })
    }

    // 从对手那里移除归顺的城市
    for (const ci of citiesToRemove) {
      delete target.cities[ci]

      // 同步移除对手的initialCities数据
      if (gameStore.initialCities && gameStore.initialCities[target.name]) {
        delete gameStore.initialCities[target.name][ci]
      }

      // 移除相关状态
      if (gameStore.disguisedCities && gameStore.disguisedCities[target.name]) {
        delete gameStore.disguisedCities[target.name][ci]
      }
      if (gameStore.protectedCities && gameStore.protectedCities[target.name]) {
        delete gameStore.protectedCities[target.name][ci]
      }
      if (gameStore.ironCities && gameStore.ironCities[target.name]) {
        delete gameStore.ironCities[target.name][ci]
      }

      // 从对手出阵列表中移除
      if (gameStore.roster && gameStore.roster[target.name]) {
        gameStore.roster[target.name] = gameStore.roster[target.name]
          .filter(rName => rName !== ci)
      }
    }

    // centerCityName 不需要调整（已经是城市名称）

    // 第二阶段：对手所有未被归顺的城市（包括中心和钢铁城市）HP减半
    for (const [ci, city] of Object.entries(target.cities)) {
      if (!city) continue
      const hp2 = city.currentHp !== undefined ? city.currentHp : city.hp
      if (hp2 <= 0 || city.isAlive === false) continue

      const effectiveName = getEffectiveName(target.name, ci)

      // 检查保护罩
      if (gameStore.consumeProtection(target.name, ci)) {
        continue // 保护罩破裂，跳过该城市
      }

      const disguise = gameStore.disguisedCities &&
                      gameStore.disguisedCities[target.name] &&
                      gameStore.disguisedCities[target.name][ci]

      const currentHp = city.currentHp || city.hp
      if (disguise && disguise.roundsLeft > 0) {
        // 伪装城市：真实HP和伪装HP都减半
        const beforeFox = disguise.disguiseAsHp || currentHp
        city.currentHp = Math.floor(currentHp / TUNE.siMianChuGe.hpDivisor)
        if (disguise.disguiseAsHp !== undefined) {
          disguise.disguiseAsHp = Math.floor(disguise.disguiseAsHp / TUNE.siMianChuGe.hpDivisor)
        }
        halvedCities.push({
          name: effectiveName,
          before: Math.floor(beforeFox),
          after: Math.floor(disguise.disguiseAsHp || city.currentHp)
        })
      } else {
        // 普通城市：只有真实HP
        const before = currentHp
        city.currentHp = Math.floor(currentHp / TUNE.siMianChuGe.hpDivisor)
        halvedCities.push({
          name: effectiveName,
          before: Math.floor(before),
          after: Math.floor(city.currentHp)
        })
      }
    }

    // 添加到己方
    for (let idx = 0; idx < transferredCities.length; idx++) {
      const item = transferredCities[idx]
      const city = item.cityObj
      const newKey = city.name
      caster.cities[newKey] = city

      // 加入出阵列表
      if (!gameStore.roster[caster.name]) {
        gameStore.roster[caster.name] = []
      }
      if (!gameStore.roster[caster.name].includes(newKey)) {
        gameStore.roster[caster.name].push(newKey)
      }

      // 同步添加到己方的initialCities
      if (gameStore.initialCities) {
        if (!gameStore.initialCities[caster.name]) {
          gameStore.initialCities[caster.name] = {}
        }
        const _transferred = transferredInitialCities[idx]
        gameStore.initialCities[caster.name][_transferred.name] = {
          name: _transferred.name,
          hp: _transferred.hp,
          currentHp: _transferred.hp,
          baseHp: _transferred.hp,
          isAlive: true
        }
      }

      // 标记归顺的城市为已知
      gameStore.setCityKnown(caster.name, newKey, target.name)
    }

    // 构建日志消息
    let logMsg = `你对${target.name}使用了四面楚歌`
    if (transferredCities.length > 0) {
      const names = transferredCities.map(x => x.cityObj.name).join('、')
      logMsg += `，归顺城市：${names}`
    }

    if (halvedCities.length > 0) {
      logMsg += `${transferredCities.length > 0 ? '；' : '，'}${halvedCities.length}座城市HP减半`
    }

    if (exposedFoxCities.length > 0) {
      const details = exposedFoxCities.map(x => x.name).join('、')
      logMsg += `${transferredCities.length > 0 || halvedCities.length > 0 ? '；' : '，'}${details}`
    }

    if (transferredCities.length === 0 && halvedCities.length === 0 && exposedFoxCities.length === 0) {
      logMsg += `，但没有符合条件的城市`
    }

    gameStore.addPrivateLog(caster.name, logMsg)

    // 目标可见的私有日志（显示哪些城市被影响）
    let targetLogMsg = `${caster.name}对你使用了四面楚歌`
    if (transferredCities.length > 0) {
      const names = transferredCities.map(x => x.cityObj.name).join('、')
      targetLogMsg += `，归顺城市：${names}`
    }
    if (halvedCities.length > 0) {
      const details = halvedCities.map(x => `${x.name}(${x.before}->${x.after})`).join('、')
      targetLogMsg += `${transferredCities.length > 0 ? '；' : '，'}HP减半：${details}`
    }
    gameStore.logs.push({
      message: targetLogMsg,
      timestamp: Date.now(),
      round: gameStore.currentRound,
      isPrivate: true,
      visibleTo: [target.name]
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '四面楚歌',
      `${caster.name}对${target.name}使用了四面楚歌`,
      `${caster.name}使用了四面楚歌`
    )


    return {
      success: true,
      message: `四面楚歌！${transferredCities.length > 0 ? `归顺${transferredCities.length}座城市` : ''}${halvedCities.length > 0 ? ` 减半${halvedCities.length}座城市` : ''}`,
      data: {
        transferredCities: transferredCities.map(x => x.cityObj.name),
        halvedCities: halvedCities,
        exposedFoxCities: exposedFoxCities
      }
    }
  }
}
