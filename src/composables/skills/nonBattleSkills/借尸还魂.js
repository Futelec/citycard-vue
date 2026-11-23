/**
 * 金币技能：借尸还魂
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJieShiHuanHun(gameStore) {
  return function executeJieShiHuanHun(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    if (selfCity.isAlive !== false) {
      return { success: false, message: '城市未阵亡，无需复活' }
    }

    // 检查是否有待处理的先声夺人请求（避免冲突）
    if (gameStore.pendingPreemptiveStrike) {
      return {
        success: false,
        message: '当前有待处理的先声夺人请求，请先完成'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('借尸还魂', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 从ALL_CITIES或baseHp获取原始HP
    const originalCity = gameStore.getCityByName(selfCity.name)
    const baseHp = selfCity.baseHp || originalCity?.hp || selfCity.hp

    // 复活到50%HP，上限5000
    const reviveHp = Math.min(Math.floor(baseHp * TUNE.jieShiHuanHun.reviveRatio), TUNE.jieShiHuanHun.maxHp)

    // 复活城市
    selfCity.isAlive = true
    selfCity.currentHp = reviveHp

    // 清除疲劳指数（修复：必须重置player.streaks，这是applyFatigueReduction实际读取的属性）
    const cityName = selfCity.name
    if (cityName) {
      // 重置player对象上的streaks（fatigue系统使用的实际属性）
      if (!caster.streaks) caster.streaks = {}
      caster.streaks[cityName] = 0
      // 同时重置gameStore.fatigueStreaks（兼容旧代码）
      if (!gameStore.fatigueStreaks[caster.name]) {
        gameStore.fatigueStreaks[caster.name] = {}
      }
      gameStore.fatigueStreaks[caster.name][cityName] = 0
      // 标记为本轮复活的城市（applyFatigueReduction会跳过本轮复活的城市）
      if (!gameStore.revivedCities[caster.name]) {
        gameStore.revivedCities[caster.name] = {}
      }
      gameStore.revivedCities[caster.name][cityName] = true
    }

    // 清除生于紫室状态（复活后不保留）
    if (gameStore.purpleChamber && gameStore.purpleChamber[caster.name] === cityName) {
      delete gameStore.purpleChamber[caster.name]
    }

    // 从deadCities列表移除
    if (gameStore.deadCities[caster.name]) {
      const deadIdx = gameStore.deadCities[caster.name].indexOf(cityName)
      if (deadIdx > -1) {
        gameStore.deadCities[caster.name].splice(deadIdx, 1)
      }
    }

    // 如果总城市数≤5，自动加入roster
    if (Object.keys(caster.cities).length <= TUNE.jieShiHuanHun.autoRosterMaxCities && cityName) {
      if (!gameStore.roster[caster.name]) {
        gameStore.roster[caster.name] = []
      }
      if (!gameStore.roster[caster.name].includes(cityName)) {
        gameStore.roster[caster.name].push(cityName)
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '借尸还魂',
      `${caster.name} 对${selfCity.name}使用借尸还魂，复活并恢复${reviveHp}HP（疲劳已清除）`,
      `${caster.name}使用了借尸还魂`
    )

    return {
      success: true,
      message: `${selfCity.name}复活，恢复${reviveHp}HP`
    }
  }
}
