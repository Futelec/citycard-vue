/**
 * 金币技能：以礼来降
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteYiLiLaiJiang(gameStore) {
  return function executeYiLiLaiJiang(caster, target, targetCity) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    // 兼容在线模式传入字符串
    if (typeof targetCity === 'string') {
      const cityName = targetCity
      targetCity = target.cities[cityName]
      if (!targetCity) {
        return { success: false, message: '目标城市不存在' }
      }
    }

    const targetCityName = targetCity.name
    if (!target.cities[targetCityName]) {
      return { success: false, message: '目标城市不存在' }
    }

    // 检查是否是中心城市
    const mode = gameStore.gameMode || '2P'
    if ((mode === '2P' || mode === '2v2') && target.centerCityName === targetCityName) {
      return { success: false, message: '无法对中心城市使用以礼来降' }
    }

    // 检查是否是钢铁城市
    if (gameStore.ironCities[target.name] && gameStore.ironCities[target.name][targetCityName] > 0) {
      return { success: false, message: '无法对钢铁城市使用以礼来降' }
    }

    // 检查城市是否已知（使用isCityKnown确保正确的p_前缀键访问和Set/Array兼容）
    if (!gameStore.isCityKnown(target.name, targetCityName, caster.name)) {
      return { success: false, message: '该城市尚未已知，无法使用以礼来降' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('以礼来降', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还（含阵亡城市）
    if (gameStore.isSubCenter(target.name, targetCityName)) {
      addSkillUsageLog(gameStore, caster.name, '以礼来降',
        `${caster.name}使用了以礼来降，但目标是副中心城市，技能无效`,
        `${caster.name}使用了以礼来降`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // === Step 1: 立即抢夺城市 ===

    // 保存原始疲劳streak和changeFlagMark数据（在移除之前）
    const savedStreak = (target.streaks && target.streaks[targetCityName]) || 0
    const savedChangeFlagMark = (gameStore.changeFlagMark[target.name] && gameStore.changeFlagMark[target.name][targetCityName]) || null

    // 从对手移除城市
    delete target.cities[targetCityName]

    // 同步移除initialCities
    if (gameStore.initialCities[target.name]) {
      delete gameStore.initialCities[target.name][targetCityName]
    }

    // 更新对手的roster
    if (gameStore.roster[target.name]) {
      gameStore.roster[target.name] = gameStore.roster[target.name]
        .filter(name => name !== targetCityName)
    }

    // 移除对手该城市的streaks
    if (target.streaks) {
      delete target.streaks[targetCityName]
    }

    // 移除对手该城市的changeFlagMark
    if (gameStore.changeFlagMark[target.name]) {
      delete gameStore.changeFlagMark[target.name][targetCityName]
    }

    // 移除对手该城市的定海神针状态
    if (gameStore.anchored?.[target.name]?.[targetCityName]) {
      delete gameStore.anchored[target.name][targetCityName]
    }

    // 移除对手该城市的生于紫室状态（被归顺后不保留）
    if (gameStore.purpleChamber && gameStore.purpleChamber[target.name] === targetCityName) {
      delete gameStore.purpleChamber[target.name]
    }

    // 移除对手该城市的副中心状态（被归顺后不保留）
    if (gameStore.subCenters && gameStore.subCenters[target.name] === targetCityName) {
      delete gameStore.subCenters[target.name]
    }

    // 从deadCities列表中移除（如果目标是已阵亡城市）
    if (gameStore.deadCities && gameStore.deadCities[target.name]) {
      const deadIdx = gameStore.deadCities[target.name].indexOf(targetCityName)
      if (deadIdx > -1) {
        gameStore.deadCities[target.name].splice(deadIdx, 1)
      }
    }

    // 获取初始HP（从ALL_CITIES查找）
    const originalCityData = gameStore.getCityByName(targetCityName)
    const initialHp = originalCityData ? originalCityData.hp : (targetCity.baseHp || targetCity.hp)

    // 恢复到初始HP并添加到己方
    const stolenCity = { ...targetCity }
    stolenCity.currentHp = initialHp
    stolenCity.hp = initialHp
    stolenCity.baseHp = initialHp
    stolenCity.isAlive = true
    caster.cities[targetCityName] = stolenCity

    // 记录到initialCities
    if (!gameStore.initialCities[caster.name]) {
      gameStore.initialCities[caster.name] = {}
    }
    gameStore.initialCities[caster.name][targetCityName] = {
      name: targetCityName,
      hp: initialHp,
      currentHp: initialHp,
      baseHp: initialHp,
      isAlive: true
    }

    // 转移疲劳streak
    if (!caster.streaks) caster.streaks = {}
    caster.streaks[targetCityName] = savedStreak

    // 转移changeFlagMark
    if (savedChangeFlagMark) {
      if (!gameStore.changeFlagMark[caster.name]) gameStore.changeFlagMark[caster.name] = {}
      gameStore.changeFlagMark[caster.name][targetCityName] = { ...savedChangeFlagMark }
    }

    // 如果总城市数≤5，自动加入roster
    if (Object.keys(caster.cities).length <= TUNE.yiLiLaiJiang.autoRosterMaxCities) {
      if (!gameStore.roster[caster.name]) {
        gameStore.roster[caster.name] = []
      }
      if (!gameStore.roster[caster.name].includes(targetCityName)) {
        gameStore.roster[caster.name].push(targetCityName)
      }
    }

    // 被抢夺的城市对target为已知（城市现在属于caster）
    gameStore.setCityKnown(caster.name, targetCityName, target.name)

    addSkillEffectLog(gameStore, `${caster.name}抢夺了${target.name}的城市，HP恢复至${initialHp}`)

    // === Step 2: 从未使用城市池抽取同省城市 ===
    const province = gameStore.getProvinceOfCity(targetCityName)
    const unusedCities = gameStore.getUnusedCities()
    let bonusCity = null

    if (province && province.name === '直辖市和特区') {
      // 直辖市/港澳：抽取HP在5000-15000之间的未使用城市
      const candidates = unusedCities.filter(c => c.hp > TUNE.yiLiLaiJiang.municipalityMinHp && c.hp < TUNE.yiLiLaiJiang.municipalityMaxHp)
      if (candidates.length > 0) {
        bonusCity = candidates[Math.floor(Math.random() * candidates.length)]
      }
    } else if (province) {
      // 普通省份：抽取同省未使用城市
      const provinceCityNames = province.cities.map(c => c.name)
      const candidates = unusedCities.filter(c => provinceCityNames.includes(c.name))
      if (candidates.length > 0) {
        bonusCity = candidates[Math.floor(Math.random() * candidates.length)]
      }
    }

    let bonusMsg = ''
    if (bonusCity) {
      const newCity = {
        name: bonusCity.name,
        hp: bonusCity.hp,
        currentHp: bonusCity.hp,
        baseHp: bonusCity.hp,
        isAlive: true,
        red: bonusCity.red || 0,
        green: bonusCity.green || 0,
        blue: bonusCity.blue || 0,
        yellow: bonusCity.yellow || 0,
        modifiers: []
      }
      caster.cities[newCity.name] = newCity
      gameStore.markCityAsUsed(bonusCity.name)

      if (!gameStore.initialCities[caster.name]) {
        gameStore.initialCities[caster.name] = {}
      }
      gameStore.initialCities[caster.name][newCity.name] = {
        name: newCity.name,
        hp: newCity.hp,
        currentHp: newCity.hp,
        baseHp: newCity.hp,
        isAlive: true
      }

      // 如果总城市数≤5，自动加入roster
      if (Object.keys(caster.cities).length <= TUNE.yiLiLaiJiang.autoRosterMaxCities) {
        if (!gameStore.roster[caster.name]) {
          gameStore.roster[caster.name] = []
        }
        if (!gameStore.roster[caster.name].includes(newCity.name)) {
          gameStore.roster[caster.name].push(newCity.name)
        }
      }

      // 额外获得的城市对target为已知
      gameStore.setCityKnown(caster.name, newCity.name, target.name)

      addSkillEffectLog(gameStore, `${caster.name}额外获得了${newCity.name}(HP:${newCity.hp})`)
      bonusMsg = `，额外获得${newCity.name}(HP:${newCity.hp})`
    } else {
      addSkillEffectLog(gameStore, `未使用城市池中没有符合条件的同省城市可供抽取`)
      bonusMsg = '，但未使用城市池中没有符合条件的城市'
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '以礼来降',
      `${caster.name}对${target.name}的城市使用了以礼来降，抢夺该城市`,
      `${caster.name}对${target.name}的${targetCityName}使用了以礼来降，抢夺该城市并恢复HP至${initialHp}${bonusMsg}`
    )

    return {
      success: true,
      message: `成功抢夺${targetCityName}(HP恢复至${initialHp})${bonusMsg}`,
      data: {
        targetCity: targetCityName,
        targetPlayer: target.name,
        bonusCity: bonusCity ? bonusCity.name : null
      }
    }
  }
}
