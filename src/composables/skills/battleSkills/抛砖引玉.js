/**
 * 金币技能：抛砖引玉
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecutePaoZhuanYinYu(gameStore) {
  return function executePaoZhuanYinYu(caster) {
    // 获取战斗预备城市
    const rosterIndices = gameStore.roster[caster.name] || []
    if (rosterIndices.length === 0) {
      return {
        success: false,
        message: '没有战斗预备城市'
      }
    }

    // 筛选非中心城市
    const nonCenterRoster = rosterIndices.filter(name => {
      const city = caster.cities[name]
      return city && !city.isCenter && city.isAlive !== false
    })

    if (nonCenterRoster.length === 0) {
      return {
        success: false,
        message: '没有非中心的战斗预备城市'
      }
    }

    // 找到HP最低的城市
    let lowestHpCityName = nonCenterRoster[0]
    let lowestHp = caster.cities[lowestHpCityName].currentHp || caster.cities[lowestHpCityName].hp

    for (let name of nonCenterRoster) {
      const city = caster.cities[name]
      const hp = city.currentHp || city.hp
      if (hp < lowestHp) {
        lowestHp = hp
        lowestHpCityName = name
      }
    }

    const targetCity = caster.cities[lowestHpCityName]

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('抛砖引玉', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 设置抛砖引玉状态
    if (!gameStore.paozhuanyinyu) {
      gameStore.paozhuanyinyu = {}
    }
    if (!gameStore.paozhuanyinyu[caster.name]) {
      gameStore.paozhuanyinyu[caster.name] = {}
    }

    gameStore.paozhuanyinyu[caster.name][lowestHpCityName] = {
      roundsLeft: TUNE.paoZhuanYinYu.roundsLeft,
      originalHp: lowestHp,
      cityName: targetCity.name
    }

    // 从roster中移除该城市
    const rosterIndex = gameStore.roster[caster.name].indexOf(lowestHpCityName)
    if (rosterIndex > -1) {
      gameStore.roster[caster.name].splice(rosterIndex, 1)
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '抛砖引玉',
      `${caster.name}使用了抛砖引玉，抛砖引玉生效，${targetCity.name}禁止出战5回合，期间每回合战斗结束可额外获得2金币，5回合后HP变为20%`,
      `${caster.name}使用了抛砖引玉`
    )

    return {
      success: true,
      message: `${targetCity.name}禁止出战5回合，每回合战斗结束+2金币，5回合后HP变为20%`
    }
  }
}
