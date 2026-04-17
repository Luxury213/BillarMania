// app/screens/ShopScreen.tsx — SIN usePowerups interno
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { POWERUPS, Powerup } from '../../config/powerups';

const { width: SW, height: SH } = Dimensions.get('window');

const C = {
  bg:      '#060910',
  primary: '#3a86ff',
  accent:  '#ff006e',
  gold:    '#ffbe0b',
  green:   '#00ff88',
  purple:  '#8338ec',
  orange:  '#fb5607',
  white:   '#ffffff',
  dark:    '#0d1117',
  border:  '#1e2a3a',
};

const CUES = [
  { id: 'cue_classic', name: 'CLÁSICO',  price: 0,   owned: true,  emoji: '🎱', color: '#c8913a', stripeColor: '#e8d090', description: 'El taco de siempre. Madera de fresno pulida a mano.' },
  { id: 'cue_fire',    name: 'INFERNO',  price: 300, owned: false, emoji: '🔥', color: '#ff4500', stripeColor: '#ffbe0b', description: 'Forjado en carbono negro con incrustaciones de rubí.' },
  { id: 'cue_ice',     name: 'GLACIAR',  price: 300, owned: false, emoji: '❄️', color: '#00cfff', stripeColor: '#ffffff', description: 'Tallado en cristal de hielo ártico.' },
];

const getRandomPowerups = (): Powerup[] => {
  const shuffled = [...POWERUPS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 2);
};

interface ShopScreenProps {
  coins: number;
  round: number;
  score: number;
  inventory: string[];                          // ✅ viene de Index
  onBuyPowerup: (id: string) => boolean;        // ✅ viene de Index
  onSellPowerup: (id: string) => boolean;       // ✅ viene de Index
  onClose: (result: { coins: number; selectedCue: string }) => void;
}

export default function ShopScreen({
  coins,
  round,
  score,
  inventory,
  onBuyPowerup,
  onSellPowerup,
  onClose,
}: ShopScreenProps) {
  // ✅ Sin usePowerups() aquí — todo viene por props

  const [currentCoins, setCurrentCoins] = useState(coins);
  const [ownedCues, setOwnedCues]       = useState<string[]>(['cue_classic']);
  const [selectedCue, setSelectedCue]   = useState('cue_classic');
  const [modalItem, setModalItem]       = useState<any>(null);
  const [tab, setTab]                   = useState<'cues' | 'boosters'>('boosters');
  const [buyMsg, setBuyMsg]             = useState('');
  const [availablePowerups, setAvailablePowerups] = useState<Powerup[]>([]);

  // ✅ Sincronizar si coins del padre cambian (seguridad extra)
  useEffect(() => { setCurrentCoins(coins); }, [coins]);

  useEffect(() => {
    setAvailablePowerups(getRandomPowerups());
  }, [round]);

  function showMsg(msg: string) {
    setBuyMsg(msg);
    setTimeout(() => setBuyMsg(''), 2000);
  }

  function buyCue(cue: typeof CUES[0]) {
    if (ownedCues.includes(cue.id)) {
      setSelectedCue(cue.id);
      showMsg(`✅ Taco ${cue.name} equipado`);
      return;
    }
    if (currentCoins < cue.price) {
      showMsg('❌ No tienes suficientes monedas');
      return;
    }
    // ✅ Solo actualiza local — los tacos no necesitan el hook global
    setCurrentCoins(c => c - cue.price);
    setOwnedCues(prev => [...prev, cue.id]);
    setSelectedCue(cue.id);
    showMsg(`✅ ¡${cue.name} comprado y equipado!`);
  }

  function buyPowerupItem(powerup: Powerup) {
    if (inventory.includes(powerup.id)) {
      showMsg('Ya tienes este potenciador');
      return;
    }
    if (currentCoins < powerup.price) {
      showMsg('❌ No tienes suficientes monedas');
      return;
    }
    // ✅ Llama al hook central desde Index
    const success = onBuyPowerup(powerup.id);
    if (success) {
      setCurrentCoins(c => c - powerup.price);
      showMsg(`✅ ¡${powerup.name} comprado!`);
    } else {
      showMsg('❌ Inventario lleno o error al comprar');
    }
  }

  function handleClose() {
    onClose({ coins: currentCoins, selectedCue });
  }

  function CuePreview({ cue }: { cue: typeof CUES[0] }) {
    return (
      <View style={styles.cuePreviewWrap}>
        <View style={[styles.cueBody, { backgroundColor: cue.color }]}>
          <View style={[styles.cueTip, { backgroundColor: cue.stripeColor }]} />
          <View style={[styles.cueBand, { backgroundColor: cue.stripeColor + '88' }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏪 TIENDA</Text>
          <Text style={styles.headerSub}>RONDA {round} COMPLETADA · {score} PTS</Text>
        </View>
        <View style={styles.coinsBox}>
          <Text style={styles.coinsLabel}>💰 MONEDAS</Text>
          <Text style={styles.coinsValue}>{currentCoins}</Text>
        </View>
      </View>

      {buyMsg !== '' && (
        <View style={styles.flashMsg}>
          <Text style={styles.flashText}>{buyMsg}</Text>
        </View>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'boosters' && styles.tabActive]} onPress={() => setTab('boosters')}>
          <Text style={[styles.tabText, tab === 'boosters' && styles.tabTextActive]}>⚡ POTENCIADORES</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'cues' && styles.tabActive]} onPress={() => setTab('cues')}>
          <Text style={[styles.tabText, tab === 'cues' && styles.tabTextActive]}>🎱 TACOS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tab === 'boosters' && (
          <>
            <Text style={styles.rotateNote}>🎲 POTENCIADORES DISPONIBLES ESTA RONDA</Text>
            {availablePowerups.map(p => {
              // ✅ usa inventory de props, no del hook local
              const owned = inventory.includes(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.card, owned && styles.cardOwned]}
                  onPress={() => setModalItem({ type: 'booster', data: p })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.boosterIcon, { borderColor: p.color }]}>
                    <Text style={styles.boosterEmoji}>{p.emoji}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.cardRow}>
                      <Text style={[styles.cardName, { color: p.color }]}>{p.name}</Text>
                      {owned && <View style={styles.ownedBadge}><Text style={styles.ownedText}>COMPRADO</Text></View>}
                    </View>
                    <Text style={styles.cardDesc}>{p.description}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    {owned ? (
                      <View style={[styles.btnOwned, { borderColor: p.color }]}>
                        <Text style={[styles.btnOwnedText, { color: p.color }]}>✓ OWNED</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.btnBuy, { borderColor: p.color }]}
                        onPress={() => buyPowerupItem(p)}
                      >
                        <Text style={[styles.btnBuyText, { color: p.color }]}>💰 {p.price}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {tab === 'cues' && CUES.map(cue => {
          const owned    = ownedCues.includes(cue.id);
          const equipped = selectedCue === cue.id;
          return (
            <TouchableOpacity
              key={cue.id}
              style={[styles.card, equipped && styles.cardEquipped]}
              onPress={() => setModalItem({ type: 'cue', data: cue })}
              activeOpacity={0.85}
            >
              <CuePreview cue={cue} />
              <View style={styles.cardInfo}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardName}>{cue.emoji} {cue.name}</Text>
                  {equipped && <View style={styles.equippedBadge}><Text style={styles.equippedText}>EQUIPADO</Text></View>}
                  {owned && !equipped && <View style={styles.ownedBadge}><Text style={styles.ownedText}>TUYO</Text></View>}
                </View>
                <Text style={styles.cardDesc}>{cue.description}</Text>
              </View>
              <View style={styles.cardRight}>
                {cue.price === 0 || owned ? (
                  <TouchableOpacity style={[styles.btnEquip, equipped && styles.btnEquipped]} onPress={() => buyCue(cue)}>
                    <Text style={styles.btnEquipText}>{equipped ? '✓ USO' : 'EQUIPAR'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.btnBuy} onPress={() => buyCue(cue)}>
                    <Text style={styles.btnBuyText}>💰 {cue.price}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.continueBtn} onPress={handleClose}>
        <Text style={styles.continueBtnText}>CONTINUAR RONDA {round + 1} →</Text>
      </TouchableOpacity>

      <Modal visible={modalItem !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalItem(null)} activeOpacity={1}>
          <View style={styles.modalBox}>
            {modalItem?.type === 'cue' && (
              <>
                <Text style={styles.modalTitle}>{modalItem.data.emoji} {modalItem.data.name}</Text>
                <View style={styles.modalCueWrap}>
                  <View style={[styles.cueBodyLarge, { backgroundColor: modalItem.data.color }]}>
                    <View style={[styles.cueTipLarge, { backgroundColor: modalItem.data.stripeColor }]} />
                  </View>
                </View>
                <Text style={styles.modalSection}>📖 DESCRIPCIÓN</Text>
                <Text style={styles.modalText}>{modalItem.data.description}</Text>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => { buyCue(modalItem.data); setModalItem(null); }}
                >
                  <Text style={styles.modalBtnText}>
                    {ownedCues.includes(modalItem.data.id)
                      ? (selectedCue === modalItem.data.id ? '✓ EQUIPADO' : 'EQUIPAR')
                      : `COMPRAR 💰 ${modalItem.data.price}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {modalItem?.type === 'booster' && (
              <>
                <Text style={[styles.modalTitle, { color: modalItem.data.color }]}>
                  {modalItem.data.emoji} {modalItem.data.name}
                </Text>
                <Text style={styles.boosterEmojiLarge}>{modalItem.data.emoji}</Text>
                <Text style={styles.modalSection}>📖 EFECTO</Text>
                <Text style={styles.modalText}>{modalItem.data.description}</Text>
                <Text style={styles.modalSection}>⏱ DURACIÓN</Text>
                <Text style={styles.modalText}>Efecto permanente después de comprarlo</Text>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderColor: modalItem.data.color }]}
                  onPress={() => { buyPowerupItem(modalItem.data); setModalItem(null); }}
                >
                  <Text style={[styles.modalBtnText, { color: modalItem.data.color }]}>
                    {/* ✅ usa inventory de props */}
                    {inventory.includes(modalItem.data.id)
                      ? '✓ COMPRADO'
                      : `COMPRAR 💰 ${modalItem.data.price}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setModalItem(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕ CERRAR</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:      { color: C.gold, fontSize: 20, fontWeight: 'bold', letterSpacing: 4, fontFamily: 'monospace' },
  headerSub:        { color: '#555', fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', marginTop: 2 },
  coinsBox:         { alignItems: 'flex-end', backgroundColor: C.dark, borderWidth: 1, borderColor: C.gold + '66', borderRadius: 2, paddingHorizontal: 14, paddingVertical: 8 },
  coinsLabel:       { color: '#888', fontSize: 9, letterSpacing: 2, fontFamily: 'monospace' },
  coinsValue:       { color: C.gold, fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace' },
  flashMsg:         { backgroundColor: C.dark, borderWidth: 1, borderColor: C.primary + '66', marginHorizontal: 16, marginTop: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 2 },
  flashText:        { color: C.white, fontSize: 12, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 1 },
  tabs:             { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tab:              { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:        { borderBottomColor: C.accent },
  tabText:          { color: '#555', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 },
  tabTextActive:    { color: C.accent },
  scroll:           { flex: 1 },
  scrollContent:    { padding: 16, gap: 12 },
  rotateNote:       { color: C.gold, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center', marginBottom: 4 },
  card:             { flexDirection: 'row', backgroundColor: C.dark, borderWidth: 1, borderColor: C.border, borderRadius: 2, padding: 14, alignItems: 'center', gap: 14 },
  cardEquipped:     { borderColor: C.accent + '88', backgroundColor: '#0d1117' },
  cardOwned:        { borderColor: C.green + '88', backgroundColor: '#0d1117' },
  cardInfo:         { flex: 1, gap: 4 },
  cardRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:         { color: C.white, fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 2 },
  cardDesc:         { color: '#666', fontSize: 10, fontFamily: 'monospace', lineHeight: 15 },
  cardRight:        { alignItems: 'center' },
  equippedBadge:    { backgroundColor: C.accent + '22', borderWidth: 1, borderColor: C.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  equippedText:     { color: C.accent, fontSize: 8, fontFamily: 'monospace', letterSpacing: 1 },
  ownedBadge:       { backgroundColor: C.green + '22', borderWidth: 1, borderColor: C.green, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  ownedText:        { color: C.green, fontSize: 8, fontFamily: 'monospace', letterSpacing: 1 },
  btnEquip:         { borderWidth: 1, borderColor: C.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2 },
  btnEquipped:      { borderColor: C.accent, backgroundColor: C.accent + '22' },
  btnEquipText:     { color: C.primary, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },
  btnBuy:           { borderWidth: 1, borderColor: C.gold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2 },
  btnBuyText:       { color: C.gold, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },
  btnOwned:         { borderWidth: 1, borderColor: C.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2, backgroundColor: C.green + '22' },
  btnOwnedText:     { color: C.green, fontSize: 9, fontFamily: 'monospace', letterSpacing: 1 },
  boosterIcon:      { width: 56, height: 56, borderRadius: 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark },
  boosterEmoji:     { fontSize: 28 },
  boosterEmojiLarge:{ fontSize: 60, textAlign: 'center', marginVertical: 12 },
  continueBtn:      { margin: 16, borderWidth: 2, borderColor: C.accent, paddingVertical: 14, alignItems: 'center', borderRadius: 2, backgroundColor: C.accent + '15' },
  continueBtnText:  { color: C.accent, fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 4 },
  modalBackdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox:         { backgroundColor: C.dark, borderWidth: 1, borderColor: C.border, borderRadius: 2, padding: 24, width: '100%', maxWidth: 380, gap: 10 },
  modalTitle:       { color: C.gold, fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 3, textAlign: 'center' },
  modalSection:     { color: C.primary, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginTop: 6 },
  modalText:        { color: '#999', fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
  modalBtn:         { borderWidth: 1, borderColor: C.gold, paddingVertical: 12, alignItems: 'center', marginTop: 8, borderRadius: 2 },
  modalBtnText:     { color: C.gold, fontSize: 12, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 'bold' },
  modalClose:       { alignItems: 'center', marginTop: 4 },
  modalCloseText:   { color: '#444', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 },
  modalCueWrap:     { alignItems: 'center', marginVertical: 8 },
  cuePreviewWrap:   { width: 60, alignItems: 'center' },
  cueBody:          { width: 8, height: 60, borderRadius: 4, justifyContent: 'flex-end', alignItems: 'center' },
  cueTip:           { width: 6, height: 10, borderRadius: 3 },
  cueBand:          { position: 'absolute', top: 12, width: 8, height: 6, borderRadius: 2 },
  cueBodyLarge:     { width: 12, height: 90, borderRadius: 6, justifyContent: 'flex-end', alignItems: 'center' },
  cueTipLarge:      { width: 8, height: 14, borderRadius: 4 },
});