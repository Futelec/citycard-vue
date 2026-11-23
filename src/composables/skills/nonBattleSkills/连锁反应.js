/**
 * 金币技能：连锁反应
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteLianSuoFanYing(gameStore) {
  return function executeLianSuoFanYing(caster, target, targetCity) {
    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '连锁反应')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '连锁反应',
        `${caster.name}使用连锁反应，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了连锁反应`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('连锁反应', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取城市名称
    const cityName = targetCity.name
    if (!target.cities[cityName]) {
      return { success: false, message: '目标城市不在玩家城市列表中' }
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, cityName)) {
      addSkillUsageLog(gameStore, caster.name, '连锁反应',
        `${caster.name}使用了连锁反应，但目标是副中心城市，技能无效`,
        `${caster.name}使用了连锁反应`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 检查并消耗保护罩/钢铁护盾
    if (gameStore.consumeProtection(target.name, cityName)) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '连锁反应',
        `${caster.name}的连锁反应击破了${target.name}的城市护盾`,
        `${caster.name}的连锁反应击破了${target.name}的${targetCity.name}护盾`
      )
      return {
        success: true,
        message: `击破了${targetCity.name}的护盾`
      }
    }

    // 阶段1：对目标城市造成2000伤害
    const targetName = targetCity.name
    const currentHp = targetCity.currentHp || targetCity.hp
    const newHp = Math.max(0, currentHp - TUNE.lianSuoFanYing.damage)
    targetCity.currentHp = newHp

    const targetDied = newHp <= 0
    if (targetDied) {
      targetCity.isAlive = false
      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (!gameStore.deadCities[target.name].includes(cityName)) {
        gameStore.deadCities[target.name].push(cityName)
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '连锁反应',
      `${caster.name}对${target.name}的城市使用连锁反应，造成2000伤害${targetDied ? '并阵亡' : ''}`,
      `${caster.name}对${target.name}的${targetName}使用连锁反应，造成2000伤害${targetDied ? '并阵亡' : `（剩余${Math.floor(newHp)}）`}`
    )


    // 如果目标未死，直接结束
    if (!targetDied) {
      return {
        success: true,
        message: `${targetName}受到2000伤害`
      }
    }

    // 阶段2：目标已死，对其余所有存活城市造成1000溅射伤害
    const allCityNames = Object.keys(target.cities)
    const otherAliveCities = allCityNames
      .filter(cn => cn !== cityName && target.cities[cn] && target.cities[cn].isAlive !== false)

    if (otherAliveCities.length === 0) {
      addSkillEffectLog(gameStore, `连锁反应：目标城市阵亡，但对手无其他存活城市`)
      return {
        success: true,
        message: `${targetName}阵亡，但对手无其他存活城市`
      }
    }

    const deadFrom1000 = []
    otherAliveCities.forEach(aliveCityName => {
      const city = target.cities[aliveCityName]
      const cName = city.name

      // 跳过副中心城市（免疫连锁反应溅射）
      if (gameStore.isSubCenter(target.name, aliveCityName)) return

      // 检查并消耗保护罩/钢铁护盾
      if (gameStore.consumeProtection(target.name, aliveCityName)) {
        addSkillEffectLog(gameStore, `${target.name}的城市护盾抵消了1000伤害`)
        return
      }

      const cityCurrentHp = city.currentHp || city.hp
      const cityNewHp = Math.max(0, cityCurrentHp - TUNE.lianSuoFanYing.splashDamage)
      city.currentHp = cityNewHp

      if (cityNewHp <= 0) {
        city.isAlive = false
        if (!gameStore.deadCities[target.name].includes(aliveCityName)) {
          gameStore.deadCities[target.name].push(aliveCityName)
        }
        deadFrom1000.push(cName)
      }
    })

    // 如果没有城市因1000伤害阵亡，结束
    if (deadFrom1000.length === 0) {
      addSkillEffectLog(gameStore, `连锁反应：目标城市阵亡，其余城市各受1000伤害`)
      return {
        success: true,
        message: `${targetName}阵亡，其余城市各受1000伤害`
      }
    }

    // 阶段3：有城市因1000伤害阵亡，对仍存活的城市额外造成500伤害
    const stillAlive = otherAliveCities.filter(cn => target.cities[cn].isAlive !== false)
    const deadFrom500 = []

    stillAlive.forEach(aliveCityName => {
      const city = target.cities[aliveCityName]
      const cName2 = city.name

      // 跳过副中心城市（免疫连锁反应溅射）
      if (gameStore.isSubCenter(target.name, aliveCityName)) return

      // 检查并消耗保护罩/钢铁护盾
      if (gameStore.consumeProtection(target.name, aliveCityName)) {
        addSkillEffectLog(gameStore, `${cName2}的护盾抵消了500伤害`)
        return
      }

      const cityCurrentHp = city.currentHp || city.hp
      const cityNewHp = Math.max(0, cityCurrentHp - TUNE.lianSuoFanYing.extraDamage)
      city.currentHp = cityNewHp

      if (cityNewHp <= 0) {
        city.isAlive = false
        if (!gameStore.deadCities[target.name].includes(aliveCityName)) {
          gameStore.deadCities[target.name].push(aliveCityName)
        }
        deadFrom500.push(cName2)
      }
    })

    addSkillEffectLog(gameStore, `连锁反应：${targetName}阵亡，${deadFrom1000.join('、')}因1000伤害阵亡，剩余城市再受500伤害${deadFrom500.length > 0 ? `，${deadFrom500.join('、')}因此阵亡` : ''}`)

    return {
      success: true,
      message: `连锁反应完成！${targetName}阵亡，触发两次溅射，共消灭${deadFrom1000.length + deadFrom500.length}个城市`
    }
  }
}
