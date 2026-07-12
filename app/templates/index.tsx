import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NativeDateTimeField from '../../components/NativeDateTimeField';
import type { Job } from '../../types/models';

type JobRow = Omit<Job, 'isActive'> & { isActive: number };
type TemplateRow = {
  id: number;
  name: string;
  jobId: number | null;
  jobName: string | null;
  jobColor: string | null;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes: number;
  notes: string | null;
};

export default function ShiftTemplatesScreen() {
  const db = useSQLiteContext();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState('');
  const [jobId, setJobId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('30');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [jobRows, templateRows] = await Promise.all([
      db.getAllAsync<JobRow>(`SELECT id, name, hourly_rate AS hourlyRate,
        overtime_multiplier AS overtimeMultiplier, color,
        is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
        FROM jobs WHERE is_active = 1 ORDER BY name COLLATE NOCASE`),
      db.getAllAsync<TemplateRow>(`SELECT t.id, t.name, t.job_id AS jobId,
        j.name AS jobName, j.color AS jobColor,
        t.start_time AS startTime, t.end_time AS endTime,
        t.unpaid_break_minutes AS unpaidBreakMinutes, t.notes
        FROM shift_templates t LEFT JOIN jobs j ON j.id = t.job_id
        ORDER BY t.name COLLATE NOCASE`),
    ]);
    const activeJobs = jobRows.map((job) => ({ ...job, isActive: Boolean(job.isActive) }));
    setJobs(activeJobs);
    setJobId((current) => current ?? activeJobs[0]?.id ?? null);
    setTemplates(templateRows);
  }, [db]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const parsedBreak = Number.parseInt(breakMinutes || '0', 10);
  const validTimes = useMemo(() => /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) && /^([01]\d|2[0-3]):[0-5]\d$/.test(endTime), [startTime, endTime]);

  const save = async () => {
    if (!name.trim()) return setError('Enter a template name.');
    if (!validTimes || endTime <= startTime) return setError('Clock out must be after clock in.');
    if (!Number.isInteger(parsedBreak) || parsedBreak < 0) return setError('Break minutes must be zero or more.');
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const shiftMinutes = eh * 60 + em - (sh * 60 + sm);
    if (parsedBreak >= shiftMinutes) return setError('Break must be shorter than the shift.');
    const now = new Date().toISOString();
    await db.runAsync(`INSERT INTO shift_templates
      (name, job_id, start_time, end_time, unpaid_break_minutes, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      name.trim(), jobId, startTime, endTime, parsedBreak, notes.trim() || null, now, now);
    setName(''); setNotes(''); setError(null); await load();
  };

  const remove = async (id: number) => {
    const perform = async () => { await db.runAsync('DELETE FROM shift_templates WHERE id = ?', id); await load(); };
    if (Platform.OS === 'web') { if (window.confirm('Delete this shift template?')) await perform(); return; }
    Alert.alert('Delete template?', 'This does not delete any time entries.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void perform() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Shift Templates' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>QUICK ENTRY</Text>
        <Text style={styles.title}>Shift templates</Text>
        <Text style={styles.subtitle}>Save schedules you use often, then apply them when adding a shift.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Template name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Example: Weekday 9–5" style={styles.input} />

          <Text style={styles.label}>Default job</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {jobs.map((job) => (
              <Pressable key={job.id} onPress={() => setJobId(job.id)} style={[styles.chip, jobId === job.id && styles.chipSelected]}>
                <View style={[styles.dot, { backgroundColor: job.color }]} />
                <Text style={[styles.chipText, jobId === job.id && styles.chipTextSelected]}>{job.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.flex}><NativeDateTimeField label="Clock in" mode="time" value={startTime} onChange={setStartTime} placeholder="09:00" /></View>
            <View style={styles.flex}><NativeDateTimeField label="Clock out" mode="time" value={endTime} onChange={setEndTime} placeholder="17:00" /></View>
          </View>

          <Text style={styles.label}>Unpaid break</Text>
          <View style={styles.chips}>{[0,15,30,45,60].map((m)=><Pressable key={m} onPress={()=>setBreakMinutes(String(m))} style={[styles.breakChip, parsedBreak===m&&styles.chipSelected]}><Text style={[styles.chipText, parsedBreak===m&&styles.chipTextSelected]}>{m===0?'None':`${m}m`}</Text></Pressable>)}</View>
          <TextInput value={breakMinutes} onChangeText={setBreakMinutes} keyboardType="number-pad" placeholder="Custom break minutes" style={styles.input} />

          <Text style={styles.label}>Default notes</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Optional" style={[styles.input, styles.notes]} multiline />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => void save()} style={styles.primaryButton}><Ionicons name="add-circle-outline" size={20} color="#fff"/><Text style={styles.primaryText}>Save template</Text></Pressable>
        </View>

        <Text style={styles.sectionTitle}>SAVED TEMPLATES</Text>
        {templates.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>No templates yet.</Text></View> : templates.map((t)=><View key={t.id} style={styles.templateCard}><View style={styles.templateCopy}><View style={styles.templateTitleRow}><View style={[styles.dot,{backgroundColor:t.jobColor??'#94A3B8'}]}/><Text style={styles.templateTitle}>{t.name}</Text></View><Text style={styles.templateMeta}>{t.startTime}–{t.endTime} · {t.unpaidBreakMinutes}m break</Text><Text style={styles.templateMeta}>{t.jobName ?? 'No default job'}</Text></View><Pressable onPress={()=>void remove(t.id)} style={styles.deleteButton}><Ionicons name="trash-outline" size={19} color="#DC2626"/></Pressable></View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({safeArea:{flex:1,backgroundColor:'#F7F8FC'},content:{padding:22,paddingBottom:44},eyebrow:{color:'#2563EB',fontSize:12,fontWeight:'800',letterSpacing:1.4,marginTop:12},title:{color:'#0F172A',fontSize:31,fontWeight:'800',marginTop:5},subtitle:{color:'#64748B',fontSize:15,lineHeight:22,marginTop:8,marginBottom:20},card:{backgroundColor:'#fff',borderRadius:22,padding:18},label:{color:'#334155',fontSize:13,fontWeight:'800',marginTop:14,marginBottom:8},input:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:14,paddingHorizontal:14,minHeight:48,color:'#0F172A',backgroundColor:'#fff'},notes:{minHeight:80,paddingTop:13,textAlignVertical:'top'},row:{flexDirection:'row',gap:12},flex:{flex:1},chips:{flexDirection:'row',gap:8},chip:{flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderColor:'#CBD5E1',borderRadius:999,paddingHorizontal:12,minHeight:40},breakChip:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:999,paddingHorizontal:12,minHeight:38,alignItems:'center',justifyContent:'center'},chipSelected:{backgroundColor:'#2563EB',borderColor:'#2563EB'},chipText:{color:'#475569',fontWeight:'700'},chipTextSelected:{color:'#fff'},dot:{width:9,height:9,borderRadius:5},error:{color:'#DC2626',fontSize:13,fontWeight:'700',marginTop:14},primaryButton:{backgroundColor:'#2563EB',minHeight:52,borderRadius:15,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',marginTop:18},primaryText:{color:'#fff',fontSize:15,fontWeight:'800'},sectionTitle:{color:'#64748B',fontSize:12,fontWeight:'800',letterSpacing:1.2,marginTop:28,marginBottom:10},templateCard:{backgroundColor:'#fff',borderRadius:18,padding:16,marginBottom:10,flexDirection:'row',alignItems:'center'},templateCopy:{flex:1},templateTitleRow:{flexDirection:'row',alignItems:'center',gap:8},templateTitle:{color:'#0F172A',fontSize:16,fontWeight:'800'},templateMeta:{color:'#64748B',fontSize:13,marginTop:5},deleteButton:{width:42,height:42,borderRadius:13,backgroundColor:'#FEF2F2',alignItems:'center',justifyContent:'center'},empty:{backgroundColor:'#fff',borderRadius:18,padding:22,alignItems:'center'},emptyText:{color:'#64748B'}});
