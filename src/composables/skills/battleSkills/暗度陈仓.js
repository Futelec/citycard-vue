/**
 * 金币技能：暗度陈仓
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteAnDuChenCang(gameStore) {
  return function executeAnDuChenCang(caster) {
    // 检查游戏模式（仅限3P）
    if (gameStore.gameMode !== '3P') {
      return {
        success: false,
        message: '暗度陈仓仅限3人模式使用！'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('暗度陈仓', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 获取当前roster（预备城市）
    const currentRoster = gameStore.roster[caster.name] || []

    // 获取未出战且存活的城市
    const aliveCities = []
    Object.entries(caster.cities).forEach(([cityName, city]) => {
      if (city.isAlive !== false && !currentRoster.includes(cityName)) {
        aliveCities.push({ city, cityName })
      }
    })

    if (aliveCities.length === 0) {
      return {
        success: false,
        message: '没有未出战且存活的城市！'
      }
    }

    // 随机选择一个未出战的城市（简化处理）
    const randomIdx = Math.floor(Math.random() * aliveCities.length)
    const selected = aliveCities[randomIdx]

    // 将该城市加入roster
    if (!gameStore.roster[caster.name]) {
      gameStore.roster[caster.name] = []
    }
    gameStore.roster[caster.name].push(selected.cityName)

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '暗度陈仓',
      `${caster.name}使用了暗度陈仓，暗度陈仓生效，额外派出${selected.city.name}(HP:${Math.floor(selected.city.currentHp || selected.city.hp)})`,
      '${caster.name}使用了暗度陈仓'
    )

    return {
      success: true,
      message: `额外派出${selected.city.name}(HP:${Math.floor(selected.city.currentHp || selected.city.hp)})`
    }
  }
}
