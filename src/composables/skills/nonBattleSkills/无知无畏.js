/**
 * 金币技能：无知无畏
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteWuZhiWuWei(gameStore) {
  return function executeWuZhiWuWei(caster, target) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('无知无畏', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '无知无畏')) {
      // 双日志：被阻挡
      addSkillUsageLog(
        gameStore,
        caster.name,
        '无知无畏',
        `无知无畏被${target.name}的坚不可摧护盾阻挡`,
        `你使用了无知无畏，但被${target.name}的坚不可摧护盾阻挡`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    const aliveCities = Object.values(caster.cities).filter(c => c.isAlive !== false && (c.currentHp || c.hp) > 0)
    if (aliveCities.length === 0) {
      return { success: false, message: '没有可用城市' }
    }

    // 排除副中心城市（副中心不会被自动选为自毁城市，战略转移到中心后可用）
    const selectableCities = aliveCities.filter(c => !gameStore.isSubCenter(caster.name, c.name))
    if (selectableCities.length === 0) {
      return { success: false, message: '没有可用城市（副中心城市不可自毁）' }
    }

    // 找到血量最低的城市
    const lowestHpCity = selectableCities.reduce((min, city) =>
      (city.currentHp || city.hp) < (min.currentHp || min.hp) ? city : min
    )

    const cityName = lowestHpCity.name
    const attackerHp = lowestHpCity.currentHp || lowestHpCity.hp

    // 判断攻击者是否为中心城市
    const isCenterAttack = (cityName === caster.centerCityName)

    // 计算伤害：如果是中心城市攻击，伤害×2
    let damage = attackerHp
    if (isCenterAttack) {
      damage *= TUNE.wuZhiWuWei.centerDamageMultiplier
    }

    // 伤害上限：非中心攻击者7500，中心攻击者15000
    const dmgCap = isCenterAttack ? TUNE.wuZhiWuWei.centerDmgCap : TUNE.wuZhiWuWei.nonCenterDmgCap
    damage = Math.min(damage, dmgCap)

    // 自毁城市
    lowestHpCity.isAlive = false
    lowestHpCity.currentHp = 0

    // 添加到deadCities列表
    if (!gameStore.deadCities[caster.name]) {
      gameStore.deadCities[caster.name] = []
    }
    if (cityName && !gameStore.deadCities[caster.name].includes(cityName)) {
      gameStore.deadCities[caster.name].push(cityName)
    }

    // 对目标中心造成伤害（需要处理屏障）
    let actualDamage = damage

    // 检查目标是否有屏障
    if (gameStore.barrier[target.name] && gameStore.barrier[target.name].hp > 0) {
      const barrier = gameStore.barrier[target.name]
      const barrierDamage = Math.min(actualDamage, barrier.hp)
      barrier.hp -= barrierDamage
      actualDamage -= barrierDamage

      addSkillEffectLog(gameStore, `${target.name}的屏障吸收了${barrierDamage}点伤害，剩余${barrier.hp}HP`)

      if (barrier.hp <= 0) {
        delete gameStore.barrier[target.name]
        addSkillEffectLog(gameStore, `${target.name}的屏障被摧毁`)
      }
    }

    // 如果还有剩余伤害，对中心城市造成伤害
    if (actualDamage > 0) {
      // 找到中心城市
      const centerCity = target.cities[target.centerCityName]
      if (centerCity) {
        const currentHp = centerCity.currentHp || centerCity.hp
        centerCity.currentHp = Math.max(0, currentHp - actualDamage)

        if (centerCity.currentHp <= 0) {
          centerCity.isAlive = false
        }
      }
    }

    // 获取目标中心城市剩余血量（用于日志）
    const targetCenterCity = target.cities[target.centerCityName]
    const centerRemainingHp = targetCenterCity ? Math.floor(targetCenterCity.currentHp || 0) : 0

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '无知无畏',
      `用${lowestHpCity.name}${isCenterAttack ? '（中心城市，伤害×2）' : ''}使用无知无畏，对${target.name}造成${damage}伤害后自毁，其中心剩余血量 ${centerRemainingHp}`,
      `你用${lowestHpCity.name}使用了无知无畏`
    )

    return {
      success: true,
      message: `${lowestHpCity.name}攻击中心后自毁，造成${damage}伤害${isCenterAttack ? '（中心×2）' : ''}`
    }
  }
}
