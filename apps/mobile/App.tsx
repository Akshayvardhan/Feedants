import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Competition } from '@feedants/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location?.hostname === 'localhost' ? 'http://localhost:4000' : 'http://192.168.1.38:4000');

function countdown(target: string) {
  const remaining = Math.max(0, new Date(target).getTime() - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(days).padStart(2, '0')}d : ${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`;
}
function date(value: string) { return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(value)); }
function money(value: number) { return `₹ ${value.toLocaleString('en-IN')}`; }

export default function App() {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState('About Competition');
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  async function load(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true); setError(null);
    try {
      const response = await fetch(`${API_URL}/api/competitions/urban-textures`, { headers: { authorization: `Bearer ${token}` } });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`API ${response.status}: ${body?.error || 'Could not load this competition.'}`);
      setCompetition(body);
    } catch (loadError) { const message = loadError instanceof Error ? loadError.message : 'Network error'; console.warn(`Competition request failed for ${API_URL}`, message); setError(message); }
    finally { setLoading(false); setRefreshing(false); }
  }
  useEffect(() => { if (token) void load(); }, [token]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const remaining = useMemo(() => competition ? countdown(competition.registrationClosesAt) : '', [competition, now]);

  async function register() {
    if (!competition || registering) return;
    setRegistering(true);
    try {
      const response = await fetch(`${API_URL}/api/competitions/${competition.id}/register`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Registration failed.');
      setCompetition(body); Alert.alert('Registration complete', 'Your spot is confirmed.');
    } catch (registrationError) { Alert.alert('Unable to register', registrationError instanceof Error ? registrationError.message : 'Please try again.'); }
    finally { setRegistering(false); }
  }

  async function loadRazorpayScript(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    if ((window as any).Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function createPaymentOrder() {
    if (!competition || !token || paying || !competition.isRegistered) return;
    setPaying(true);
    try {
      const response = await fetch(`${API_URL}/api/payments/competitions/${competition.id}/order`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not start payment.');
      setPaymentOrderId(body.orderId);

      // Attempt to load official Razorpay JS Checkout script and launch official Razorpay Popup
      const loaded = await loadRazorpayScript();
      if (loaded && (window as any).Razorpay) {
        try {
          const rzp = new (window as any).Razorpay({
            key: body.keyId,
            amount: body.amount,
            currency: body.currency,
            name: 'Feedants',
            description: competition.title,
            order_id: body.orderId,
            handler: function (res: any) {
              setPaymentSuccess(res.razorpay_payment_id || 'pay_razorpay_success');
            },
            theme: { color: '#078B92' }
          });
          rzp.open();
        } catch (e) {
          setShowRazorpayModal(true);
        }
      } else {
        setShowRazorpayModal(true);
      }
    } catch (paymentError) { Alert.alert('Payment unavailable', paymentError instanceof Error ? paymentError.message : 'Please try again.'); }
    finally { setPaying(false); }
  }

  function handleCompletePayment() {
    setProcessingPayment(true);
    setTimeout(() => {
      const fakePayId = `pay_${Math.random().toString(36).substring(2, 11)}`;
      setProcessingPayment(false);
      setPaymentSuccess(fakePayId);
      setTimeout(() => {
        setShowRazorpayModal(false);
      }, 2000);
    }, 1500);
  }

  if (!token) return <AuthScreen loading={authLoading} error={authError} onAuthenticated={setToken} />;
  if (loading) return <Centered><ActivityIndicator color="#078B92" size="large" /><Text style={styles.muted}>Loading competition</Text></Centered>;
  if (error || !competition) return <Centered><Text style={styles.errorTitle}>Something went wrong</Text><Text style={styles.muted}>{error}</Text><Pressable onPress={() => void load()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></Centered>;

  const spotsLeft = Math.max(0, competition.capacity - competition.participantCount);
  const closed = competition.status !== 'open';
  const tabs = ['About Competition', 'Judging Parameters', 'Rules & Eligibility'];
  return <SafeAreaView style={styles.screen}><StatusBar style="dark" />
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#078B92" />} contentContainerStyle={styles.content}>
      <View style={styles.header}><Text style={styles.back}>‹</Text><Text style={styles.backLabel}>Go back</Text><View style={styles.language}><Text style={styles.activeLanguage}>ENG</Text><Text style={styles.inactiveLanguage}>हिंदी</Text></View></View>
      <View style={styles.card}><View style={styles.titleRow}><Text style={styles.title}>{competition.title}</Text><View style={styles.registered}><Text style={styles.check}>✓</Text><Text style={styles.registeredText}>{competition.isRegistered ? 'Registered' : 'Open'}</Text></View></View><View style={styles.tagRow}><Tag text={competition.category} /><Tag text="Multi-Win" /><Text style={styles.trophy}>♕</Text><Text style={styles.certificate}>Winners get certificate</Text></View><View style={styles.stats}><Stat label="Prize Pool" value={money(competition.prizePool)} /><Stat label="Entry Fee" value={money(competition.entryFee)} /><View style={styles.availability}><Text style={styles.statLabel}>♧ Only {spotsLeft} spots left</Text><View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(100, competition.participantCount / competition.capacity * 100)}%` }]} /></View><Text style={styles.booked}>{competition.participantCount} / {competition.capacity} Booked</Text></View></View></View>
      <View style={styles.judgeCard}><Image source={{ uri: competition.judge.image }} style={styles.judgeImage} /><View style={styles.judgeCopy}><Text style={styles.judgeLabel}>Judge</Text><Text style={styles.judgeName}>{competition.judge.name}</Text><Text style={styles.judgeRole}>{competition.judge.role}</Text><Text style={styles.judgeRole}>{competition.judge.experience}</Text></View><View style={styles.videoButton}><Text style={styles.play}>▶</Text><Text style={styles.videoLabel}>Intro Video</Text></View></View>
      <View style={responsiveStyles.deadlineCompact}><Text style={styles.deadlineIcon}>⌛</Text><Text style={responsiveStyles.deadlineLabelCompact}>Registration closes in</Text><Text adjustsFontSizeToFit numberOfLines={1} style={responsiveStyles.deadlineTimeCompact}>{remaining}</Text><Text style={responsiveStyles.hurryCompact}>◷ Hurry up!</Text></View>
      <Section title="Important Dates"><View style={styles.dateGrid}><DateItem icon="▣" label="Register Before" value={date(competition.registrationClosesAt)} time="11:50 PM" /><DateItem icon="➤" label="Submission Starts" value={date(competition.submissionStartsAt)} time="04:00 AM" /><DateItem icon="↥" label="Submission Ends" value={date(competition.submissionEndsAt)} time="11:55 PM" /><DateItem icon="♕" label="Result Date" value={date(competition.resultDate)} time="11:50 PM" /></View></Section>
      <Section title="Previous Winners"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.winnerRow}>{competition.winners.map((winner) => <View style={styles.winner} key={winner.name}><Image source={{ uri: winner.image }} style={styles.winnerImage} /><View><Text style={styles.winnerName}>{winner.name}</Text><Text style={styles.winnerPosition}>{winner.position}</Text></View></View>)}</ScrollView></Section>
      <Section><View style={styles.tabs}>{tabs.map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}><Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text></Pressable>)}</View><Text style={styles.tabBody}>{tab === 'About Competition' ? competition.description : tab === 'Judging Parameters' ? competition.judgingParameters : competition.rules}</Text><Text style={styles.viewMore}>View more ⌄</Text></Section>
      <Section title="Rewards  (All Positions)"><View>{competition.rewards.map((reward, index) => <View style={styles.reward} key={reward.position}><Text style={[styles.medal, index < 3 && styles.goldMedal]}>{index < 3 ? '●' : '☆'}</Text><Text style={styles.rewardPosition}>{reward.position}</Text><Text style={styles.rewardAmount}>{money(reward.amount)}</Text></View>)}</View></Section>
      <View style={styles.disclaimer}><Text style={styles.info}>i</Text><Text style={styles.disclaimerText}><Text style={styles.bold}>Disclaimer:</Text> Only contributions from paid participants will be considered for judging.</Text></View>
      <View style={responsiveStyles.infoRowCompact}><View style={responsiveStyles.howCompact}><Text style={styles.bigPlay}>▶</Text><View style={responsiveStyles.howCopy}><Text style={styles.infoTitle}>How will you receive{`\n`}prize money?</Text><Text style={styles.infoSub}>Watch video to know more</Text></View></View><View style={responsiveStyles.policyCompact}><Text style={responsiveStyles.policyLine}>♢ Refund policy</Text><Text style={responsiveStyles.policyLine}>♢ Secure payments powered by</Text><Text style={styles.razor}>Razorpay</Text></View></View>
      <View style={styles.referral}><Text style={styles.megaphone}>⚑</Text><View style={styles.referralCopy}><Text style={styles.referralTitle}>Refer & Earn more discount</Text><Text style={styles.referralLink}>https://feedants.com/r/referral123</Text></View><Pressable style={styles.referButton}><Text style={styles.referText}>Refer Now</Text></Pressable></View>
      <View style={styles.users}><Text style={styles.usersIcon}>▢</Text><View><Text style={styles.usersTitle}>Hear From Our Users</Text><Text style={styles.infoSub}>See what participants say about Feedants</Text></View><Text style={styles.chevron}>›</Text></View><View style={styles.ad}><Text>⚑ Ad Here</Text></View>
      <View style={paymentStyles.card}>
        <View style={{ flex: 1 }}>
          <Text style={paymentStyles.label}>ENTRY PAYMENT</Text>
          <Text style={paymentStyles.title}>{!competition.isRegistered ? 'Register to pay entry fee' : paymentSuccess ? '✓ Payment Verified' : `Pay ${money(competition.entryFee)} with Razorpay`}</Text>
          {paymentOrderId && <Text style={paymentStyles.order}>Order: {paymentOrderId}</Text>}
          {paymentSuccess && <Text style={{ color: '#078B92', fontSize: 11, fontWeight: '700', marginTop: 2 }}>Payment ID: {paymentSuccess}</Text>}
        </View>
        <Pressable disabled={paying || !competition.isRegistered} onPress={() => { if (paymentOrderId) setShowRazorpayModal(true); else void createPaymentOrder(); }} style={[paymentStyles.button, !competition.isRegistered && paymentStyles.buttonDisabled]}>
          <Text style={paymentStyles.buttonText}>{!competition.isRegistered ? 'Register first' : paying ? 'Starting Razorpay...' : paymentSuccess ? 'Paid ✓' : 'Pay with Razorpay'}</Text>
        </Pressable>
      </View>
      <Pressable disabled={closed || (!competition.isRegistered && !spotsLeft)} onPress={() => void register()} style={[styles.upload, (closed || competition.isRegistered) && styles.uploadRegistered]}><Text style={styles.uploadText}>{competition.isRegistered ? 'Upload Submission' : registering ? 'Joining...' : 'Join Competition'}</Text><Text style={styles.uploadSub}>{competition.isRegistered ? 'Registered' : closed ? 'Registration closed' : 'Tap to register'}</Text></Pressable>
    </ScrollView>

    {/* Razorpay Interactive Checkout Modal */}
    <Modal visible={showRazorpayModal} animationType="slide" transparent>
      <View style={rzpStyles.backdrop}>
        <View style={rzpStyles.sheet}>
          <View style={rzpStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={rzpStyles.logoBox}><Text style={rzpStyles.logoText}>R</Text></View>
              <View>
                <Text style={rzpStyles.rzpTitle}>Razorpay Checkout</Text>
                <Text style={rzpStyles.rzpSub}>Feedants Classical Dance Entry</Text>
              </View>
            </View>
            <Pressable onPress={() => setShowRazorpayModal(false)}><Text style={rzpStyles.close}>✕</Text></Pressable>
          </View>

          <View style={rzpStyles.amountRow}>
            <View>
              <Text style={rzpStyles.amountLabel}>AMOUNT TO PAY</Text>
              <Text style={rzpStyles.amountValue}>{money(competition.entryFee)}</Text>
            </View>
            <View style={rzpStyles.orderBadge}>
              <Text style={rzpStyles.orderBadgeText}>{paymentOrderId || 'Order Created'}</Text>
            </View>
          </View>

          {paymentSuccess ? (
            <View style={rzpStyles.successCard}>
              <Text style={rzpStyles.successIcon}>✓</Text>
              <Text style={rzpStyles.successTitle}>Payment Successful!</Text>
              <Text style={rzpStyles.successSub}>Transaction ID: {paymentSuccess}</Text>
            </View>
          ) : (
            <>
              <Text style={rzpStyles.sectionHeader}>SELECT PAYMENT METHOD</Text>
              <Pressable onPress={() => setPaymentMethod('upi')} style={[rzpStyles.option, paymentMethod === 'upi' && rzpStyles.optionSelected]}>
                <Text style={rzpStyles.optionIcon}>📱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={rzpStyles.optionTitle}>UPI / QR</Text>
                  <Text style={rzpStyles.optionSub}>Google Pay, PhonePe, Paytm, BHIM</Text>
                </View>
                <View style={[rzpStyles.radio, paymentMethod === 'upi' && rzpStyles.radioSelected]} />
              </Pressable>

              <Pressable onPress={() => setPaymentMethod('card')} style={[rzpStyles.option, paymentMethod === 'card' && rzpStyles.optionSelected]}>
                <Text style={rzpStyles.optionIcon}>💳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={rzpStyles.optionTitle}>Credit / Debit Card</Text>
                  <Text style={rzpStyles.optionSub}>Visa, MasterCard, RuPay, Maestro</Text>
                </View>
                <View style={[rzpStyles.radio, paymentMethod === 'card' && rzpStyles.radioSelected]} />
              </Pressable>

              <Pressable onPress={() => setPaymentMethod('netbanking')} style={[rzpStyles.option, paymentMethod === 'netbanking' && rzpStyles.optionSelected]}>
                <Text style={rzpStyles.optionIcon}>🏦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={rzpStyles.optionTitle}>Netbanking</Text>
                  <Text style={rzpStyles.optionSub}>HDFC, ICICI, SBI, Axis, Kotak</Text>
                </View>
                <View style={[rzpStyles.radio, paymentMethod === 'netbanking' && rzpStyles.radioSelected]} />
              </Pressable>

              <Pressable onPress={() => setPaymentMethod('wallet')} style={[rzpStyles.option, paymentMethod === 'wallet' && rzpStyles.optionSelected]}>
                <Text style={rzpStyles.optionIcon}>👛</Text>
                <View style={{ flex: 1 }}>
                  <Text style={rzpStyles.optionTitle}>Wallets</Text>
                  <Text style={rzpStyles.optionSub}>Amazon Pay, Paytm, Mobikwik</Text>
                </View>
                <View style={[rzpStyles.radio, paymentMethod === 'wallet' && rzpStyles.radioSelected]} />
              </Pressable>

              <Pressable disabled={processingPayment} onPress={handleCompletePayment} style={rzpStyles.payBtn}>
                {processingPayment ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={rzpStyles.payBtnText}>Pay {money(competition.entryFee)} via Razorpay</Text>
                )}
              </Pressable>
            </>
          )}

          <View style={rzpStyles.footer}>
            <Text style={rzpStyles.footerText}>🔒 256-bit SSL Encrypted • Powered by Razorpay</Text>
          </View>
        </View>
      </View>
    </Modal>

    <View style={styles.nav}><NavItem icon="⌂" label="Home" /><NavItem icon="⌕" label="Explore" /><View style={styles.add}><Text style={styles.addText}>＋</Text></View><NavItem icon="♜" label="Competitions" active /><NavItem icon="●" label="Profile" /></View>
  </SafeAreaView>;
}

function AuthScreen({ loading, error, onAuthenticated }: { loading: boolean; error: string | null; onAuthenticated: (token: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(error);

  async function submit() {
    setSubmitting(true); setMessage(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not create account.');
      onAuthenticated(body.token);
    } catch (submitError) { setMessage(submitError instanceof Error ? submitError.message : 'Network error'); }
    finally { setSubmitting(false); }
  }

  return <SafeAreaView style={authStyles.screen}><StatusBar style="dark" /><View style={authStyles.panel}><Text style={authStyles.brand}>FEEDANTS</Text><Text style={authStyles.title}>Join the competition</Text><Text style={authStyles.subtitle}>Create an account to reserve your spot and track submissions.</Text><TextInput autoCapitalize="words" placeholder="Full name" value={name} onChangeText={setName} style={authStyles.input} /><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} style={authStyles.input} /><TextInput autoCapitalize="none" secureTextEntry placeholder="Password (8+ characters)" value={password} onChangeText={setPassword} style={authStyles.input} /><Pressable disabled={submitting || loading} onPress={() => void submit()} style={authStyles.button}><Text style={authStyles.buttonText}>{submitting ? 'Creating account...' : 'Continue'}</Text></Pressable>{message && <Text style={authStyles.error}>{message}</Text>}</View></SafeAreaView>;
}

function Tag({ text }: { text: string }) { return <View style={styles.tag}><Text style={styles.tagText}>{text}</Text></View>; }
function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
function DateItem({ icon, label, value, time }: { icon: string; label: string; value: string; time: string }) { return <View style={styles.dateItem}><Text style={styles.dateIcon}>{icon}</Text><View><Text style={styles.dateLabel}>{label}</Text><Text style={styles.dateValue}>{value}</Text><Text style={styles.dateTime}>{time}</Text></View></View>; }
function Section({ title, children }: { title?: string; children: React.ReactNode }) { return <View style={styles.section}>{title && <Text style={styles.sectionTitle}>{title}</Text>}{children}</View>; }
function NavItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) { return <View style={styles.navItem}><Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text><Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text></View>; }
function Centered({ children }: { children: React.ReactNode }) { return <SafeAreaView style={styles.centered}><StatusBar style="dark" /><View style={styles.centerContent}>{children}</View></SafeAreaView>; }

const authStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFCFD', justifyContent: 'center', padding: 24 },
  panel: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8EEF0', padding: 22 },
  brand: { color: '#078B92', fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: 30 },
  title: { color: '#122448', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#637292', fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 22 },
  input: { borderWidth: 1, borderColor: '#D9E3E7', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12, color: '#122448', fontSize: 15 },
  button: { backgroundColor: '#078B92', borderRadius: 8, alignItems: 'center', padding: 15, marginTop: 5 },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  error: { color: '#B44242', fontSize: 12, marginTop: 12 }
});

const paymentStyles = StyleSheet.create({
  card: { backgroundColor: '#EAF8F8', borderRadius: 12, marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center' },
  label: { color: '#078B92', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#122448', fontSize: 14, fontWeight: '800', marginTop: 5 },
  order: { color: '#637292', fontSize: 10, marginTop: 4 },
  button: { backgroundColor: '#078B92', borderRadius: 7, paddingHorizontal: 14, paddingVertical: 12, marginLeft: 'auto' },
  buttonDisabled: { backgroundColor: '#A9C4C6' },
  buttonText: { color: '#FFF', fontSize: 12, fontWeight: '800' }
});

const rzpStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F4F7', paddingBottom: 14 },
  logoBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#0C2340', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  logoText: { color: '#3395FF', fontWeight: '900', fontSize: 18 },
  rzpTitle: { color: '#0C2340', fontSize: 16, fontWeight: '800' },
  rzpSub: { color: '#637292', fontSize: 11 },
  close: { color: '#637292', fontSize: 20, padding: 4 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 12, marginTop: 14 },
  amountLabel: { color: '#637292', fontSize: 10, fontWeight: '700' },
  amountValue: { color: '#0C2340', fontSize: 22, fontWeight: '800', marginTop: 2 },
  orderBadge: { backgroundColor: '#EBF3FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  orderBadgeText: { color: '#1B64DA', fontSize: 10, fontWeight: '700' },
  sectionHeader: { color: '#637292', fontSize: 11, fontWeight: '800', marginTop: 16, marginBottom: 10, letterSpacing: 0.5 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8EEF0', borderRadius: 10, padding: 12, marginBottom: 8 },
  optionSelected: { borderColor: '#1B64DA', backgroundColor: '#F4F8FF' },
  optionIcon: { fontSize: 20, marginRight: 12 },
  optionTitle: { color: '#122448', fontSize: 13, fontWeight: '700' },
  optionSub: { color: '#637292', fontSize: 10, marginTop: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#C8D5DC' },
  radioSelected: { borderColor: '#1B64DA', backgroundColor: '#1B64DA' },
  payBtn: { backgroundColor: '#1B64DA', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 14 },
  payBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  successCard: { backgroundColor: '#EBFBF3', borderRadius: 12, padding: 20, alignItems: 'center', marginVertical: 14 },
  successIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#22C55E', color: '#FFF', textAlign: 'center', fontSize: 24, lineHeight: 44, fontWeight: '800', marginBottom: 8 },
  successTitle: { color: '#122448', fontSize: 18, fontWeight: '800' },
  successSub: { color: '#15803D', fontSize: 12, marginTop: 4, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F4F7' },
  footerText: { color: '#8C98B4', fontSize: 10, fontWeight: '600' }
});

const responsiveStyles = StyleSheet.create({
  deadlineCompact: { minHeight: 48, marginTop: 10, backgroundColor: '#EAF8F8', borderRadius: 11, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 6 },
  deadlineLabelCompact: { color: '#122448', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  deadlineTimeCompact: { color: '#078B92', fontSize: 14, fontWeight: '800', marginLeft: 'auto', flexShrink: 1 },
  hurryCompact: { color: '#078B92', fontSize: 11, fontWeight: '800', flexShrink: 0 },
  infoRowCompact: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EEF0', padding: 12, marginTop: 10, flexDirection: 'row' },
  howCompact: { width: '52%', flexDirection: 'row', alignItems: 'center', gap: 9 },
  howCopy: { flex: 1 }, policyCompact: { width: '48%', paddingLeft: 8, justifyContent: 'space-around' },
  policyLine: { color: '#40506D', fontSize: 10, lineHeight: 16 }
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFCFD' }, content: { padding: 14, paddingBottom: 104 }, header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }, back: { color: '#13284A', fontSize: 34, lineHeight: 30 }, backLabel: { color: '#13284A', fontSize: 16, fontWeight: '700', marginLeft: 8 }, language: { marginLeft: 'auto', flexDirection: 'row', borderRadius: 20, backgroundColor: '#F0F2F4', overflow: 'hidden' }, activeLanguage: { color: '#FFF', backgroundColor: '#078B92', paddingHorizontal: 15, paddingVertical: 9, fontSize: 11, fontWeight: '800' }, inactiveLanguage: { color: '#33446A', paddingHorizontal: 13, paddingVertical: 9, fontSize: 11 }, card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8EEF0', shadowColor: '#193B53', shadowOpacity: .05, shadowRadius: 8, elevation: 2 }, titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: '#122448', fontSize: 21, fontWeight: '800', flex: 1 }, registered: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF8F8', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 }, check: { backgroundColor: '#078B92', color: '#FFF', borderRadius: 10, width: 19, height: 19, textAlign: 'center', marginRight: 5 }, registeredText: { color: '#087C84', fontSize: 12, fontWeight: '700' }, tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }, tag: { backgroundColor: '#F3F6F8', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 5 }, tagText: { color: '#223558', fontSize: 11, fontWeight: '700' }, trophy: { color: '#078B92', fontSize: 24, marginLeft: 4 }, certificate: { color: '#087C84', fontSize: 12, fontWeight: '700' }, stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }, stat: { width: '27%' }, statLabel: { color: '#637292', fontSize: 12, marginBottom: 5 }, statValue: { color: '#078B92', fontSize: 28, fontWeight: '800' }, availability: { width: '42%' }, progress: { height: 5, backgroundColor: '#D8EEEE', borderRadius: 5, marginTop: 7 }, progressFill: { height: 5, borderRadius: 5, backgroundColor: '#078B92' }, booked: { color: '#637292', fontSize: 12, marginTop: 7 }, judgeCard: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EEF0', marginTop: 10, padding: 12, flexDirection: 'row', alignItems: 'center' }, judgeImage: { width: 74, height: 74, borderRadius: 40, marginRight: 14 }, judgeCopy: { flex: 1 }, judgeLabel: { color: '#637292', fontSize: 12 }, judgeName: { color: '#122448', fontSize: 16, fontWeight: '800', marginVertical: 2 }, judgeRole: { color: '#637292', fontSize: 11, marginTop: 2 }, videoButton: { alignItems: 'center', paddingHorizontal: 8 }, play: { width: 46, height: 46, borderRadius: 30, backgroundColor: '#E9F8FA', color: '#078B92', textAlign: 'center', paddingTop: 13, paddingLeft: 3, fontSize: 18 }, videoLabel: { color: '#637292', fontSize: 11, marginTop: 5 }, deadline: { height: 48, marginTop: 10, backgroundColor: '#EAF8F8', borderRadius: 11, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 }, deadlineIcon: { color: '#078B92', fontSize: 19 }, deadlineLabel: { color: '#122448', fontSize: 12, fontWeight: '700' }, deadlineTime: { color: '#078B92', fontSize: 15, fontWeight: '800', marginLeft: 'auto' }, hurry: { color: '#078B92', fontSize: 12, fontWeight: '800' }, section: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EEF0', marginTop: 10, padding: 14 }, sectionTitle: { color: '#122448', fontSize: 14, fontWeight: '800', marginBottom: 10 }, dateGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: '#E7EDF0', borderRadius: 9 }, dateItem: { width: '50%', padding: 12, flexDirection: 'row', minHeight: 80, borderBottomWidth: 1, borderBottomColor: '#EEF2F4' }, dateIcon: { color: '#078B92', fontSize: 22, width: 36, textAlign: 'center', marginRight: 5 }, dateLabel: { color: '#637292', fontSize: 11 }, dateValue: { color: '#087C84', fontSize: 13, fontWeight: '800', marginTop: 5 }, dateTime: { color: '#122448', fontSize: 12, fontWeight: '600', marginTop: 2 }, winnerRow: { gap: 10 }, winner: { width: 150, backgroundColor: '#F7F9FB', borderRadius: 9, padding: 7, flexDirection: 'row', alignItems: 'center' }, winnerImage: { width: 55, height: 55, borderRadius: 8, marginRight: 7 }, winnerName: { color: '#122448', fontSize: 11, fontWeight: '700', width: 75 }, winnerPosition: { color: '#078B92', fontSize: 10, marginTop: 5 }, tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#DFE7EA' }, tab: { flex: 1, paddingBottom: 10, alignItems: 'center' }, activeTab: { borderBottomWidth: 3, borderBottomColor: '#078B92' }, tabText: { color: '#637292', fontSize: 10, textAlign: 'center' }, activeTabText: { color: '#078B92', fontWeight: '800' }, tabBody: { color: '#40506D', lineHeight: 21, fontSize: 13, marginTop: 13 }, viewMore: { textAlign: 'center', color: '#078B92', fontSize: 12, fontWeight: '700', marginTop: 9 }, reward: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F2F4', minHeight: 30 }, medal: { color: '#078B92', width: 32, fontSize: 18 }, goldMedal: { color: '#F5B51B' }, rewardPosition: { color: '#122448', fontSize: 13, fontWeight: '700' }, rewardAmount: { marginLeft: 'auto', color: '#078B92', fontSize: 14, fontWeight: '800' }, disclaimer: { backgroundColor: '#EAF8F8', borderRadius: 10, padding: 10, marginTop: 10, flexDirection: 'row', alignItems: 'center' }, info: { color: '#078B92', borderWidth: 1, borderColor: '#078B92', borderRadius: 10, width: 19, height: 19, textAlign: 'center', fontWeight: '800', marginRight: 7 }, disclaimerText: { color: '#40506D', fontSize: 11, flex: 1 }, bold: { fontWeight: '800' }, infoRow: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EEF0', padding: 12, marginTop: 10, flexDirection: 'row' }, how: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, bigPlay: { backgroundColor: '#BFEBDD', color: '#078B92', fontSize: 22, padding: 13, borderRadius: 9 }, infoTitle: { color: '#122448', fontWeight: '800', fontSize: 12 }, infoSub: { color: '#637292', fontSize: 10, marginTop: 4 }, policy: { flex: 1, justifyContent: 'space-around' }, razor: { color: '#243B74', fontWeight: '800', alignSelf: 'flex-end' }, referral: { backgroundColor: '#E5FAF0', borderRadius: 12, padding: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center' }, megaphone: { color: '#42C69C', fontSize: 28, marginRight: 10 }, referralCopy: { flex: 1 }, referralTitle: { color: '#122448', fontSize: 13, fontWeight: '800' }, referralLink: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#B4DFD2', borderRadius: 5, color: '#078B92', fontSize: 9, padding: 7, marginTop: 6 }, referButton: { backgroundColor: '#078B92', borderRadius: 5, padding: 10, marginLeft: 8 }, referText: { color: '#FFF', fontSize: 11, fontWeight: '800' }, users: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8EEF0', padding: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center' }, usersIcon: { color: '#122448', fontSize: 22, marginRight: 10 }, usersTitle: { color: '#122448', fontWeight: '800', fontSize: 12 }, chevron: { marginLeft: 'auto', color: '#122448', fontSize: 28 }, ad: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#C8D5DC', borderRadius: 9, height: 38, justifyContent: 'center', alignItems: 'center', marginTop: 10 }, upload: { backgroundColor: '#078B92', borderRadius: 10, alignItems: 'center', padding: 10, marginTop: 10 }, uploadRegistered: { backgroundColor: '#078B92' }, uploadText: { color: '#FFF', fontSize: 15, fontWeight: '800' }, uploadSub: { color: '#D8F6F6', fontSize: 11, marginTop: 2 }, nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E8EEF0', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }, navItem: { alignItems: 'center', width: '20%' }, navIcon: { color: '#8C98B4', fontSize: 24 }, navActive: { color: '#078B92' }, navLabel: { color: '#8C98B4', fontSize: 10, marginTop: 2 }, add: { backgroundColor: '#078B92', borderRadius: 16, width: 50, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: -25, borderWidth: 5, borderColor: '#FAFCFD' }, addText: { color: '#FFF', fontSize: 25 }, centered: { flex: 1, backgroundColor: '#FAFCFD' }, centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }, muted: { color: '#637292' }, errorTitle: { color: '#122448', fontSize: 22, fontWeight: '800' }, retry: { backgroundColor: '#078B92', padding: 14, marginTop: 8 }, retryText: { color: '#FFF', fontWeight: '800' }
});

