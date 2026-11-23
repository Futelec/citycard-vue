/**
 * 金币技能：趁其不备
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteChenqibubeiSuiji(gameStore) {
  return function executeChenqibubeiSuiji(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '趁其不备')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '趁其不备',
        `${caster.name}使用趁其不备，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了趁其不备`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('趁其不备', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const mode = gameStore.gameMode || '2P'
    const centerCityName = target.centerCityName
    const protections = (gameStore.protections && gameStore.protections[target.name]) || {}
    const ironCities = (gameStore.ironCities && gameStore.ironCities[target.name]) || {}
    const anchored = (gameStore.anchored && gameStore.anchored[target.name]) || {}
    const bbgs = (gameStore.bbgs && gameStore.bbgs[target.name]) || {}

    // 筛选可偷城市（排除中心城市、保护城市、钢铁城市、定海神针城市、步步高升城市、谨慎交换集合城市）
    const eligible = Object.entries(target.cities)
      .map(([cityKey, c]) => ({ city: c, cityKey, name: c.name }))
      .filter(item => {
        if ((item.city.currentHp || item.city.hp) <= 0) return false
        if (item.city.isAlive === false) return false
        if (item.name === centerCityName) return false // 排除中心城市
        if (protections[item.name] && protections[item.name] > 0) return false
        if (ironCities[item.name]) return false
        if (anchored[item.name] && anchored[item.name] > 0) return false
        if (bbgs[item.name]) return false
        if (gameStore.isInCautiousSet(target.name, item.name)) return false // 排除谨慎交换集合
        return true
      })

    if (eligible.length === 0) {
      return {
        success: false,
        message: '对手没有可偷取的城市（排除中心、保护、钢铁、定海神针、步步高升城市）'
      }
    }

    // 随机选择一个
    const selected = eligible[Math.floor(Math.random() * eligible.length)]
    const stolenCity = { ...selected.city }
    const stolenCityName = stolenCity.name
    const stolenCityHp = stolenCity.currentHp || stolenCity.hp
    const stolenCityKey = selected.cityKey

    // 保存原始疲劳streak和changeFlagMark数据（在移除之前）
    const savedStreak = (target.streaks && target.streaks[stolenCityKey]) || 0
    const savedChangeFlagMark = (gameStore.changeFlagMark?.[target.name]?.[stolenCityKey]) || null

    // 从对手移除城市
    delete target.cities[stolenCityKey]

    // 同步移除initialCities
    if (gameStore.initialCities?.[target.name]) {
      delete gameStore.initialCities[target.name][stolenCityKey]
    }

    // 更新对手的roster
    if (gameStore.roster?.[target.name]) {
      gameStore.roster[target.name] = gameStore.roster[target.name]
        .filter(name => name !== stolenCityKey)
    }

    // 更新对手的streaks
    if (target.streaks) {
      delete target.streaks[stolenCityKey]
    }

    // 更新对手的changeFlagMark
    if (gameStore.changeFlagMark?.[target.name]) {
      delete gameStore.changeFlagMark[target.name][stolenCityKey]
    }

    // centerCityName 不需要调整（已经是城市名称）

    // 添加到己方
    const newCityKey = stolenCity.name
    caster.cities[newCityKey] = stolenCity

    // 记录到initialCities
    if (!gameStore.initialCities[caster.name]) {
      gameStore.initialCities[caster.name] = {}
    }
    const _stolenHp = stolenCity.baseHp || stolenCity.hp
    gameStore.initialCities[caster.name][stolenCity.name] = {
      name: stolenCity.name,
      hp: _stolenHp,
      currentHp: _stolenHp,
      baseHp: _stolenHp,
      isAlive: true
    }

    // 转移疲劳streak到新键
    if (!caster.streaks) caster.streaks = {}
    caster.streaks[newCityKey] = savedStreak

    // 转移changeFlagMark到新键
    if (savedChangeFlagMark) {
      if (!gameStore.changeFlagMark[caster.name]) gameStore.changeFlagMark[caster.name] = {}
      gameStore.changeFlagMark[caster.name][newCityKey] = { ...savedChangeFlagMark }
    }

    // 如果总城市数量 <= 5，自动加入预备
    if (Object.keys(caster.cities).length <= TUNE.chenqibubeiSuiji.autoRosterMaxCities) {
      if (!gameStore.roster) gameStore.roster = {}
      if (!gameStore.roster[caster.name]) {
        gameStore.roster[caster.name] = []
      }
      if (!gameStore.roster[caster.name].includes(newCityKey)) {
        gameStore.roster[caster.name].push(newCityKey)
      }
    }

    // 标记被偷走的城市为已知
    gameStore.setCityKnown(caster.name, newCityKey, target.name)

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '趁其不备',
      `${caster.name}对${target.name}使用趁其不备，抢夺了${stolenCityName}(HP:${Math.floor(stolenCityHp)})`,
      `${caster.name}使用了趁其不备`
    )

    return {
      success: true,
      message: `成功抢夺了${stolenCityName}(HP:${Math.floor(stolenCityHp)})`,
      data: {
        stolenCity: stolenCityName,
        stolenHp: stolenCityHp
      }
    }
  }
}
