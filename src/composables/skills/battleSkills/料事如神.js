/**
 * 金币技能：料事如神
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteLiaoShiRuShen(gameStore) {
  return function executeLiaoShiRuShen(caster, target, targetCity) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('料事如神', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 获取双方出战城市
    const casterState = gameStore.playerStates[caster.name]
    const targetState = gameStore.playerStates[target.name]

    const myCards = (casterState.currentBattleCities || [])
    const oppCards = (targetState.currentBattleCities || [])

    if (myCards.length === 0 || oppCards.length === 0) {
      return {
        success: false,
        message: `${caster.name} 或对手本轮未出战，未触发`
      }
    }

    // 计算战斗力（有效HP + 红色加成）
    function calculatePower(player, cityName) {
      const city = player.cities[cityName]
      if (!city) return 0

      // 检查厚积薄发状态：如果城市处于厚积薄发期间，攻击力为1
      if (gameStore.hjbf && gameStore.hjbf[player.name] &&
          gameStore.hjbf[player.name][cityName] &&
          gameStore.hjbf[player.name][cityName].roundsLeft > 0) {
        return 1
      }

      const hp = city.currentHp || city.hp
      // TODO: 添加红色加成计算
      return hp
    }

    // 找出双方最低战力城市
    const myPick = myCards
      .map(card => ({ cityName: card.cityName, power: calculatePower(caster, card.cityName) }))
      .sort((a, b) => a.power - b.power)[0]

    const oppPick = oppCards
      .map(card => ({ cityName: card.cityName, power: calculatePower(target, card.cityName) }))
      .sort((a, b) => a.power - b.power)[0]

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui && gameStore.isBlockedByJianbukecui(target.name, caster.name, '料事如神')) {
      // 双日志：被阻挡
      addSkillUsageLog(
        gameStore,
        caster.name,
        '料事如神',
        `${caster.name}使用了料事如神，料事如神被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了料事如神，但被${target.name}的坚不可摧护盾阻挡`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 只有我方最低战力 < 对手最低战力时才触发
    if (myPick.power >= oppPick.power) {
      return {
        success: false,
        message: `未触发（我方最低战斗力不低于对手最低）`
      }
    }

    // 执行偷袭
    const targetCityObj = target.cities[oppPick.cityName]
    const isCenter = oppPick.cityName === target.centerCityName

    // 检查屏障
    if (gameStore.barrier[target.name]) {
      const barrier = gameStore.barrier[target.name]
      // 先打屏障2500
      const barrierDamage = Math.min(TUNE.liaoShiRuShen.barrierDamage, barrier.hp)
      barrier.hp -= barrierDamage
      const spillDamage = TUNE.liaoShiRuShen.barrierDamage - barrierDamage

      if (barrier.hp <= 0) {
        delete gameStore.barrier[target.name]
        addSkillEffectLog(gameStore, `${target.name}的屏障被摧毁`)
      }

      // 溢出伤害打目标城市
      if (spillDamage > 0) {
        // 检查海市蜃楼拦截（如果目标是中心）
        if (isCenter && gameStore.checkMirageBlock && gameStore.checkMirageBlock(target.name, `${caster.name}的料事如神`)) {
          addSkillEffectLog(gameStore, `${target.name}的海市蜃楼拦截了伤害`)
        } else {
          const currentHp = targetCityObj.currentHp || targetCityObj.hp
          targetCityObj.currentHp = Math.max(0, currentHp - spillDamage)
          if (targetCityObj.currentHp <= 0) {
            targetCityObj.isAlive = false
          }
        }
      }

      // 反弹2500也先打屏障，溢出再打进攻方最低HP城市
      const reflectDamage = Math.min(TUNE.liaoShiRuShen.barrierDamage, barrier.hp)
      barrier.hp -= reflectDamage
      const reflectSpill = TUNE.liaoShiRuShen.barrierDamage - reflectDamage

      if (reflectSpill > 0 && myCards.length > 0) {
        const lowestHpCard = myCards
          .map(card => ({ cityName: card.cityName, hp: caster.cities[card.cityName].currentHp || caster.cities[card.cityName].hp }))
          .sort((a, b) => a.hp - b.hp)[0]

        const reflectCity = caster.cities[lowestHpCard.cityName]
        const currentHp = reflectCity.currentHp || reflectCity.hp
        reflectCity.currentHp = Math.max(0, currentHp - reflectSpill)
        if (reflectCity.currentHp <= 0) {
          reflectCity.isAlive = false
        }
      }

      // 双日志：记录料事如神使用（屏障情况）
      addSkillUsageLog(
        gameStore,
        caster.name,
        '料事如神',
        `${caster.name}使用了料事如神，先手偷袭生效，攻击${target.name}的城市（屏障存在，2500打屏障后反弹处理）`,
        `${caster.name}使用了料事如神，先手偷袭${target.name}的${targetCityObj.name}`
      )
    } else {
      // 无屏障，直击5000
      // 检查海市蜃楼拦截（如果目标是中心）
      if (isCenter && gameStore.checkMirageBlock && gameStore.checkMirageBlock(target.name, `${caster.name}的料事如神`)) {
        addSkillEffectLog(gameStore, `${target.name}的海市蜃楼拦截了伤害`)
      } else {
        const currentHp = targetCityObj.currentHp || targetCityObj.hp
        targetCityObj.currentHp = Math.max(0, currentHp - TUNE.liaoShiRuShen.damage)
        if (targetCityObj.currentHp <= 0) {
          targetCityObj.isAlive = false
        }
      }

      // 双日志：记录料事如神使用（无屏障情况）
      addSkillUsageLog(
        gameStore,
        caster.name,
        '料事如神',
        `${caster.name}使用了料事如神，先手偷袭${target.name}的城市，造成5000伤害`,
        `${caster.name}使用了料事如神，先手偷袭${target.name}的${targetCityObj.name}，造成5000伤害`
      )
    }

    // 进攻方城市撤退
    casterState.currentBattleCities = casterState.currentBattleCities.filter(card => card.cityName !== myPick.cityName)

    return {
      success: true,
      message: `先手偷袭成功，随后撤退`
    }
  }
}
