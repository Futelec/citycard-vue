/**
 * 金币技能：生于紫室
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteShengYuZiShi(gameStore) {
  return function executeShengYuZiShi(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    if (selfCity.currentHp <= 0 || selfCity.isAlive === false) {
      return { success: false, message: '该城市已阵亡' }
    }

    const mode = gameStore.gameMode || '2P'
    const is2pOr2v2 = (mode === '2P' || mode === '2v2')
    const centerCityName = caster.centerCityName

    // 不能对中心城市使用
    if (is2pOr2v2 && cityName === centerCityName) {
      return { success: false, message: '不能对中心城市使用生于紫室' }
    }

    // 初始化purpleChamber结构
    if (!gameStore.purpleChamber) {
      gameStore.purpleChamber = {}
    }

    const oldChamberCityName = gameStore.purpleChamber[caster.name]
    const hasOldChamber = oldChamberCityName !== undefined

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('生于紫室', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    if (hasOldChamber) {
      // 已有加成城市，执行转移逻辑
      const oldCity = caster.cities[oldChamberCityName]
      const newCity = selfCity
      const centerCity = caster.cities[centerCityName]

      const oldCityHp = oldCity ? (oldCity.currentHp || oldCity.hp) : 0
      const newCityHp = newCity.currentHp || newCity.hp
      const centerHp = centerCity ? (centerCity.currentHp || centerCity.hp) : 0

      // 转移判定：中心>旧城市>新城市
      if (centerHp > oldCityHp && oldCityHp > newCityHp) {
        // 条件满足，执行转移
        gameStore.purpleChamber[caster.name] = cityName

        // 清除旧城市的未知状态（使用setCityKnown确保正确的p_前缀键访问）
        const allPlayers = gameStore.players || []
        allPlayers.forEach(p => {
          if (p.name !== caster.name) {
            gameStore.setCityKnown(caster.name, oldChamberCityName, p.name)
          }
        })

        // 设置新城市为未知
        gameStore.clearCityKnownStatus(caster.name, cityName)

        // 转移详情仅施法者可见，公开只显示简单信息
        addSkillUsageLog(
          gameStore,
          caster.name,
          '生于紫室',
          `${caster.name}使用了生于紫室`,
          `${caster.name}将生于紫室加成从${oldCity?.name}转移到${newCity.name}（转移条件：中心${Math.floor(centerHp)}>旧${Math.floor(oldCityHp)}>新${Math.floor(newCityHp)}）`
        )

        return {
          success: true,
          message: `成功将生于紫室加成从${oldCity?.name}转移到${newCity.name}`,
          data: {
            transferred: true,
            oldCity: oldCity?.name,
            newCity: newCity.name
          }
        }
      } else {
        // 条件不满足
        return {
          success: false,
          message: `转移条件不满足：需要中心HP(${Math.floor(centerHp)})>旧城市HP(${Math.floor(oldCityHp)})>新城市HP(${Math.floor(newCityHp)})`
        }
      }
    } else {
      // 首次使用，直接赋予加成
      gameStore.purpleChamber[caster.name] = cityName

      // 设置为未知城市
      gameStore.clearCityKnownStatus(caster.name, cityName)

      // 双日志：公开只显示"使用了生于紫室"，详细信息仅施法者可见
    addSkillUsageLog(
      gameStore,
      caster.name,
      '生于紫室',
      `${caster.name}使用了生于紫室`,
      `${caster.name}对${selfCity.name}使用了生于紫室，该城市获得2倍攻击力，成为未知城市，每回合HP+10%，中心阵亡时自动继任`
    )

      return {
        success: true,
        message: `${selfCity.name}获得生于紫室加成：2倍攻击力，成为未知城市，每回合HP+10%，中心阵亡时自动继任`,
        data: {
          transferred: false,
          cityName: selfCity.name
        }
      }
    }
  }
}
