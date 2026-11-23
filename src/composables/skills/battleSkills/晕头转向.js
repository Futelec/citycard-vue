/**
 * 金币技能：晕头转向
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteYunTouZhuanXiang(gameStore) {
  return function executeYunTouZhuanXiang(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查双方是否有出战城市（roster）
    const casterRoster = gameStore.roster[caster.name] || []
    const targetRoster = gameStore.roster[target.name] || []

    if (casterRoster.length === 0 || targetRoster.length === 0) {
      return {
        success: false,
        message: '双方都需要有出战城市才能使用晕头转向'
      }
    }

    // 筛选可交换的城市（排除中心城市、钢铁城市、定海神针城市）
    function getSwappableCities(player, roster) {
      return roster.filter(cityName => {
        const city = player.cities[cityName]
        // 排除中心城市
        if (city.isCenter) return false
        // 排除钢铁城市
        if (gameStore.hasIronShield(player.name, cityName)) return false
        // 排除定海神针城市
        if (gameStore.anchored[player.name] && gameStore.anchored[player.name][cityName]) return false
        return true
      })
    }

    const casterSwappable = getSwappableCities(caster, casterRoster)
    const targetSwappable = getSwappableCities(target, targetRoster)

    if (casterSwappable.length === 0 || targetSwappable.length === 0) {
      return {
        success: false,
        message: '双方都需要有可交换的出战城市（排除中心、钢铁、定海神针城市）'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('晕头转向', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 设置晕头转向标记
    gameStore.dizzy[caster.name] = {
      mode: 'swap',
      target: target.name
    }

    // 执行交换（随机选择可交换的城市）
    const swappedCities = []
    const minLen = Math.min(casterSwappable.length, targetSwappable.length)

    for (let i = 0; i < minLen; i++) {
      const casterCityName = casterSwappable[i]
      const targetCityName = targetSwappable[i]

      // 交换城市对象
      const temp = caster.cities[casterCityName]
      caster.cities[casterCityName] = target.cities[targetCityName]
      target.cities[targetCityName] = temp

      // 注意：initialCities 现在按城市名称追踪，无需交换
      // 城市的初始HP记录会自动跟随城市名称

      // 交换疲劳计数器（fatigue streaks）
      // 注意：疲劳按城市名称追踪，交换城市时需要交换对应的疲劳值
      if (!caster.streaks) caster.streaks = {}
      if (!target.streaks) target.streaks = {}

      const tempStreak = caster.streaks[casterCityName] || 0
      caster.streaks[casterCityName] = target.streaks[targetCityName] || 0
      target.streaks[targetCityName] = tempStreak

      // 交换拔旗易帜标记（changeFlagMark）
      if (!gameStore.changeFlagMark[caster.name]) gameStore.changeFlagMark[caster.name] = {}
      if (!gameStore.changeFlagMark[target.name]) gameStore.changeFlagMark[target.name] = {}

      const casterMark = gameStore.changeFlagMark[caster.name][casterCityName]
      const targetMark = gameStore.changeFlagMark[target.name][targetCityName]

      if (casterMark || targetMark) {
        if (targetMark) {
          gameStore.changeFlagMark[caster.name][casterCityName] = { ...targetMark }
        } else {
          delete gameStore.changeFlagMark[caster.name][casterCityName]
        }

        if (casterMark) {
          gameStore.changeFlagMark[target.name][targetCityName] = { ...casterMark }
        } else {
          delete gameStore.changeFlagMark[target.name][targetCityName]
        }
      }

      // 清除狐假虎威伪装状态
      if (gameStore.disguisedCities && gameStore.disguisedCities[caster.name] && gameStore.disguisedCities[caster.name][casterCityName]) {
        delete gameStore.disguisedCities[caster.name][casterCityName]
        addSkillEffectLog(gameStore, `${caster.name}的${caster.cities[casterCityName].name}的伪装被识破！`)
      }
      if (gameStore.disguisedCities && gameStore.disguisedCities[target.name] && gameStore.disguisedCities[target.name][targetCityName]) {
        delete gameStore.disguisedCities[target.name][targetCityName]
        addSkillEffectLog(gameStore, `${target.name}的${target.cities[targetCityName].name}的伪装被识破！`)
      }

      swappedCities.push({
        casterCity: target.cities[targetCityName].name,  // 交换后的城市
        targetCity: caster.cities[casterCityName].name
      })
    }

    const swapText = swappedCities.map((pair, i) =>
      `第${i+1}对：${caster.name}的${pair.casterCity} ⇄ ${target.name}的${pair.targetCity}`
    ).join('，')

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '晕头转向',
      `${caster.name}使用了晕头转向，晕头转向生效，交换了出战城市`,
      `你对${target.name}使用了晕头转向，交换了出战城市：${swapText}`
    )

    return {
      success: true,
      message: `交换了${swappedCities.length}对出战城市`
    }
  }
}
