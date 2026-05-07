import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Dimensions,
} from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── TEMA (mismo del juego) ───────────────────────────────────
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

// ─── TACOS ────────────────────────────────────────────────────
const CUES = [
  {
    id: 'cue_classic',
    name: 'CLÁSICO',
    price: 0,
    owned: true,
    emoji: '🎱',
    color: '#c8913a',
    stripeColor: '#e8d090',
    description: 'El taco de siempre. Madera de fresno pulida a mano. Tiro recto y confiable.',
    animDesc: 'Disparo recto con efecto de polvo blanco al impactar.',
  },
  {
    id: 'cue_fire',
    name: 'INFERNO',
    price: 300,
    owned: false,
    emoji: '🔥',
    color: '#ff4500',
    stripeColor: '#ffbe0b',
    description: 'Forjado en carbono negro con incrustaciones de rubi. Arde con cada tiro.',
    animDesc: 'Deja una estela de llamas rojas y amarillas al disparar.',
  },
  {
    id: 'cue_ice',
    name: 'GLACIAR',
    price: 300,
    owned: false,
    emoji: '❄️',
    color: '#00cfff',
    stripeColor: '#ffffff',
    description: 'Tallado en cristal de hielo ártico. Frío, preciso, mortal.',
    animDesc: 'Congela el aire a su paso, dejando cristales de hielo flotantes.',
  },
];
// POTENCIADORES

const ALL_BOOSTERS = [
  {
    id: 'booster_fire',
    name: 'FUEGO',
    emoji: '🔥',
    color: '#ff4500',
    price: 120,
    description: 'Aumenta la potencia del disparo y permite romper formaciones con mayor impacto.',
  },
  {
    id: 'booster_ice',
    name: 'HIELO',
    emoji: '❄️',
    color: '#00cfff',
    price: 100,
    description: 'Reduce la velocidad de las bolas, facilitando un mayor control y precisión.',
  },
  {
    id: 'booster_wind',
    name: 'VIENTO',
    emoji: '💨',
    color: '#00ff88',
    price: 90,
    description: 'Modifica la trayectoria de la bola, permitiendo tiros curvos y efectos inesperados.',
  },
  {
    id: 'booster_vida',
    name: '+VIDA',
    emoji: '❤️',
    color: '#ff006e',
    price: 150,
    description: 'Adquiere un tiro extra en la siguiente ronda. Úsalo bien, cada disparo cuenta.',
  },
];
// Rota los potenciadores según la ronda: ronda 1→fire, 2→ice, 3→wind, 4→fire...
function getBoostersForRound(round: number): typeof ALL_BOOSTERS {
  const offset = (round - 1) % ALL_BOOSTERS.length;
  const rotated = [
    ...ALL_BOOSTERS.slice(offset),
    ...ALL_BOOSTERS.slice(0, offset),
  ];
  return rotated.slice(0, 3);
}

// ─── PROPS ────────────────────────────────────────────────────
interface ShopScreenProps {
  coins: number;
  round: number;
  score: number;
  onClose: (result: {
    coins: number;
    selectedCue: string;
    activeBooster: string | null;
  }) => void;
}

// ─── COMPONENTE ───────────────────────────────────────────────
export default function ShopScreen({ coins, round, score, onClose }: ShopScreenProps) {
  const [currentCoins, setCurrentCoins] = useState(coins);
  const [ownedCues, setOwnedCues]       = useState<string[]>(['cue_classic']);
  const [selectedCue, setSelectedCue]   = useState('cue_classic');
  const [activeBooster, setActiveBooster] = useState<string | null>(null);
  const [modalItem, setModalItem]       = useState<any>(null);
  const [tab, setTab]                   = useState<'cues' | 'boosters'>('cues');
  const [buyMsg, setBuyMsg]             = useState('');

  const boosters = getBoostersForRound(round);

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
    setCurrentCoins(c => c - cue.price);
    setOwnedCues(prev => [...prev, cue.id]);
    setSelectedCue(cue.id);
    showMsg(`✅ ¡${cue.name} comprado y equipado!`);
  }

  function buyBooster(b: typeof ALL_BOOSTERS[0]) {
    if (activeBooster === b.id) {
      showMsg('Ya tienes este potenciador activo');
      return;
    }
    if (currentCoins < b.price) {
      showMsg('❌ No tienes suficientes monedas');
      return;
    }
    setCurrentCoins(c => c - b.price);
    setActiveBooster(b.id);
    showMsg(`✅ ¡${b.name} activado para la próxima ronda!`);
  }

 function handleClose() {
    let boosterValue: string | null = activeBooster;
    if (activeBooster === 'booster_fire') boosterValue = 'fire';
    if (activeBooster === 'booster_ice')  boosterValue = 'ice';
    if (activeBooster === 'booster_wind') boosterValue = 'wind';
    if (activeBooster === 'booster_vida') boosterValue = 'vida';

    onClose({ coins: currentCoins, selectedCue, activeBooster: boosterValue });
  }

  // ── PREVIEW DEL TACO ──────────────────────────────────────
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

      {/* ── CABECERA ── */}
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

      {/* ── MENSAJE FLASH ── */}
      {buyMsg !== '' && (
        <View style={styles.flashMsg}>
          <Text style={styles.flashText}>{buyMsg}</Text>
        </View>
      )}

      {/* ── TABS ── */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'cues' && styles.tabActive]}
          onPress={() => setTab('cues')}
        >
          <Text style={[styles.tabText, tab === 'cues' && styles.tabTextActive]}>🎱 TACOS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'boosters' && styles.tabActive]}
          onPress={() => setTab('boosters')}
        >
          <Text style={[styles.tabText, tab === 'boosters' && styles.tabTextActive]}>⚡ POTENCIADORES</Text>
        </TouchableOpacity>
      </View>

      {/* ── CONTENIDO ── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

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
                <Text style={styles.cardDesc} numberOfLines={2}>{cue.description}</Text>
                <View style={styles.cardRow}>
                  <Text style={styles.animHint}>✨ {cue.animDesc}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                {cue.price === 0 || owned ? (
                  <TouchableOpacity
                    style={[styles.btnEquip, equipped && styles.btnEquipped]}
                    onPress={() => buyCue(cue)}
                  >
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

        {tab === 'boosters' && (
          <>
            <Text style={styles.rotateNote}>
              🔄 Los potenciadores rotan cada ronda. ¡Aprovéchalos ahora!
            </Text>
            {boosters.map(b => {
              const active = activeBooster === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.card, active && styles.cardEquipped]}
                  onPress={() => setModalItem({ type: 'booster', data: b })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.boosterIcon, { borderColor: b.color }]}>
                    <Text style={styles.boosterEmoji}>{b.emoji}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.cardRow}>
                      <Text style={[styles.cardName, { color: b.color }]}>{b.name}</Text>
                      {active && <View style={[styles.equippedBadge, { backgroundColor: b.color + '33', borderColor: b.color }]}><Text style={[styles.equippedText, { color: b.color }]}>ACTIVO</Text></View>}
                    </View>
                    <Text style={styles.cardDesc}>{b.description}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    {active ? (
                      <View style={[styles.btnEquipped, { borderColor: b.color }]}>
                        <Text style={[styles.btnEquipText, { color: b.color }]}>✓ ON</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.btnBuy, { borderColor: b.color }]} onPress={() => buyBooster(b)}>
                        <Text style={[styles.btnBuyText, { color: b.color }]}>💰 {b.price}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

      </ScrollView>

      {/* ── BOTÓN CONTINUAR ── */}
      <TouchableOpacity style={styles.continueBtn} onPress={handleClose}>
        <Text style={styles.continueBtnText}>CONTINUAR RONDA {round + 1} →</Text>
      </TouchableOpacity>

      {/* ── MODAL DE DETALLE ── */}
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
                <Text style={styles.modalSection}>✨ ANIMACIÓN</Text>
                <Text style={styles.modalText}>{modalItem.data.animDesc}</Text>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => { buyCue(modalItem.data); setModalItem(null); }}
                >
                  <Text style={styles.modalBtnText}>
                    {ownedCues.includes(modalItem.data.id)
                      ? selectedCue === modalItem.data.id ? '✓ EQUIPADO' : 'EQUIPAR'
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
                <Text style={styles.modalText}>Activo durante 1 ronda completa.</Text>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderColor: modalItem.data.color }]}
                  onPress={() => { buyBooster(modalItem.data); setModalItem(null); }}
                >
                  <Text style={[styles.modalBtnText, { color: modalItem.data.color }]}>
                    {activeBooster === modalItem.data.id ? '✓ ACTIVO' : `ACTIVAR 💰 ${modalItem.data.price}`}
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

// ─── ESTILOS ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:  { color: C.gold, fontSize: 20, fontWeight: 'bold', letterSpacing: 4, fontFamily: 'monospace' },
  headerSub:    { color: '#555', fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', marginTop: 2 },
  coinsBox:     { alignItems: 'flex-end', backgroundColor: C.dark, borderWidth: 1, borderColor: C.gold + '66', borderRadius: 2, paddingHorizontal: 14, paddingVertical: 8 },
  coinsLabel:   { color: '#888', fontSize: 9, letterSpacing: 2, fontFamily: 'monospace' },
  coinsValue:   { color: C.gold, fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace' },
  flashMsg:     { backgroundColor: C.dark, borderWidth: 1, borderColor: C.primary + '66', marginHorizontal: 16, marginTop: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 2 },
  flashText:    { color: C.white, fontSize: 12, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 1 },
  tabs:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: C.accent },
  tabText:      { color: '#555', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 },
  tabTextActive:{ color: C.accent },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 16, gap: 12 },
  rotateNote:   { color: '#555', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center', marginBottom: 4 },
  card:         { flexDirection: 'row', backgroundColor: C.dark, borderWidth: 1, borderColor: C.border, borderRadius: 2, padding: 14, alignItems: 'center', gap: 14 },
  cardEquipped: { borderColor: C.accent + '88', backgroundColor: '#0d1117' },
  cardInfo:     { flex: 1, gap: 4 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:     { color: C.white, fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 2 },
  cardDesc:     { color: '#666', fontSize: 10, fontFamily: 'monospace', lineHeight: 15 },
  animHint:     { color: C.purple + 'cc', fontSize: 9, fontFamily: 'monospace', fontStyle: 'italic' },
  cardRight:    { alignItems: 'center' },
  equippedBadge:{ backgroundColor: C.accent + '22', borderWidth: 1, borderColor: C.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  equippedText: { color: C.accent, fontSize: 8, fontFamily: 'monospace', letterSpacing: 1 },
  ownedBadge:   { backgroundColor: C.green + '22', borderWidth: 1, borderColor: C.green, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  ownedText:    { color: C.green, fontSize: 8, fontFamily: 'monospace', letterSpacing: 1 },
  btnEquip:     { borderWidth: 1, borderColor: C.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2 },
  btnEquipped:  { borderColor: C.accent, backgroundColor: C.accent + '22' },
  btnEquipText: { color: C.primary, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },
  btnBuy:       { borderWidth: 1, borderColor: C.gold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2 },
  btnBuyText:   { color: C.gold, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },
  boosterIcon:  { width: 56, height: 56, borderRadius: 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark },
  boosterEmoji: { fontSize: 28 },
  boosterEmojiLarge: { fontSize: 60, textAlign: 'center', marginVertical: 12 },
  continueBtn:  { margin: 16, borderWidth: 2, borderColor: C.accent, paddingVertical: 14, alignItems: 'center', borderRadius: 2, backgroundColor: C.accent + '15' },
  continueBtnText: { color: C.accent, fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 4 },
  modalBackdrop:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox:     { backgroundColor: C.dark, borderWidth: 1, borderColor: C.border, borderRadius: 2, padding: 24, width: '100%', maxWidth: 380, gap: 10 },
  modalTitle:   { color: C.gold, fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 3, textAlign: 'center' },
  modalSection: { color: C.primary, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginTop: 6 },
  modalText:    { color: '#999', fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
  modalBtn:     { borderWidth: 1, borderColor: C.gold, paddingVertical: 12, alignItems: 'center', marginTop: 8, borderRadius: 2 },
  modalBtnText: { color: C.gold, fontSize: 12, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 'bold' },
  modalClose:   { alignItems: 'center', marginTop: 4 },
  modalCloseText: { color: '#444', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 },
  modalCueWrap: { alignItems: 'center', marginVertical: 8 },
  cuePreviewWrap: { width: 60, alignItems: 'center' },
  cueBody:      { width: 8, height: 60, borderRadius: 4, justifyContent: 'flex-end', alignItems: 'center' },
  cueTip:       { width: 6, height: 10, borderRadius: 3 },
  cueBand:      { position: 'absolute', top: 12, width: 8, height: 6, borderRadius: 2 },
  cueBodyLarge: { width: 12, height: 90, borderRadius: 6, justifyContent: 'flex-end', alignItems: 'center' },
  cueTipLarge:  { width: 8, height: 14, borderRadius: 4 },
});