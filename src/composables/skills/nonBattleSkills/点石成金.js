/**
 * 金币技能：点石成金
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteHaoGaoWuYuan(gameStore) {
  return function executeHaoGaoWuYuan(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    const currentHp = selfCity.currentHp || selfCity.hp

    // 从未使用城市池中筛选HP更高的城市
    const unusedCities = gameStore.getUnusedCities()
    const higherHpCities = unusedCities.filter(city => city.hp > currentHp)

    if (higherHpCities.length === 0) {
      return {
        success: false,
        message: '城市池中没有HP更高的城市'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('点石成金', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 随机选择一个HP更高的城市
    const randomCity = higherHpCities[Math.floor(Math.random() * higherHpCities.length)]

    // 创建新城市（保留原城市的技能等级）
    const newCity = {
      name: randomCity.name,
      hp: randomCity.hp,
      currentHp: randomCity.hp,
      baseHp: randomCity.hp,
      isAlive: true,
      red: selfCity.red || 0,     // 保留原技能等级
      green: selfCity.green || 0,
      blue: selfCity.blue || 0,
      yellow: selfCity.yellow || 0,
      modifiers: selfCity.modifiers || []
    }

    // 找到原城市在对象中的键
    const oldCityKey = selfCity.name
    if (!caster.cities[oldCityKey]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 替换城市：删除旧键，添加新键
    delete caster.cities[oldCityKey]
    caster.cities[newCity.name] = newCity

    // 关键修复：如果替换的是中心城市，将中心转移到新城市
    if (caster.centerCityName === oldCityKey) {
      caster.centerCityName = newCity.name
      debugLog(`[点石成金] 中心城市从 ${oldCityKey} 转移到 ${newCity.name}`)
    }

    // 继承城市状态：定海神针（保留剩余回合数）
    if (gameStore.anchored && gameStore.anchored[caster.name] &&
        gameStore.anchored[caster.name][oldCityKey] !== undefined) {
      gameStore.anchored[caster.name][newCity.name] = gameStore.anchored[caster.name][oldCityKey]
      delete gameStore.anchored[caster.name][oldCityKey]
      debugLog(`[点石成金] 定海神针状态转移: ${oldCityKey} → ${newCity.name}`)
    }

    // 继承城市状态：钢铁城市（保留剩余护盾层数）
    if (gameStore.ironCities && gameStore.ironCities[caster.name] &&
        gameStore.ironCities[caster.name][oldCityKey] !== undefined) {
      gameStore.ironCities[caster.name][newCity.name] = gameStore.ironCities[caster.name][oldCityKey]
      delete gameStore.ironCities[caster.name][oldCityKey]
      debugLog(`[点石成金] 钢铁城市状态转移: ${oldCityKey} → ${newCity.name}`)
    }

    // 保留步步高升状态（更新originalHp为新城市HP）
    if (gameStore.bbgs && gameStore.bbgs[caster.name] && gameStore.bbgs[caster.name][oldCityKey]) {
      gameStore.bbgs[caster.name][newCity.name] = gameStore.bbgs[caster.name][oldCityKey]
      gameStore.bbgs[caster.name][newCity.name].originalHp = newCity.hp
      delete gameStore.bbgs[caster.name][oldCityKey]
    }

    // 步步高升会把城市加入谨慎交换集合，换城后同步城市名
    if (gameStore.cautiousSet && gameStore.cautiousSet[caster.name]) {
      const cautiousCities = gameStore.cautiousSet[caster.name]
      const cautiousIndex = cautiousCities.indexOf(oldCityKey)
      if (cautiousIndex >= 0) {
        cautiousCities[cautiousIndex] = newCity.name
      }
    }

    // 标记新城市为已使用
    gameStore.markCityAsUsed(randomCity.name)

    // 更新initialCities（为新城市创建正确的初始记录）
    if (gameStore.initialCities[caster.name]) {
      delete gameStore.initialCities[caster.name][oldCityKey]
      gameStore.initialCities[caster.name][newCity.name] = {
        name: newCity.name,
        hp: newCity.hp,
        currentHp: newCity.hp,
        baseHp: newCity.hp,
        isAlive: true,
        red: newCity.red,
        green: newCity.green,
        blue: newCity.blue,
        yellow: newCity.yellow
      }
    }

    // 双日志：公开只显示使用了技能，详情为私密
    addSkillUsageLog(
      gameStore,
      caster.name,
      '点石成金',
      `${caster.name}使用了点石成金`,
      `你使用了点石成金，${selfCity.name} → ${newCity.name}(HP: ${newCity.hp})`
    )

    return {
      success: true,
      message: `城市已强化，${selfCity.name} → ${newCity.name}(HP: ${newCity.hp})`,
      hidePublicLog: true
    }
  }
}
