import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroIcon}><Ionicons name="shield-checkmark-outline" size={30} color="#2563EB" /></View>
        <Text style={styles.title}>Your time data stays yours.</Text>
        <Text style={styles.updated}>Last updated: July 12, 2026</Text>
        <Text style={styles.body}>Timesheet Mobile is designed as a local-first application. Your jobs, shifts, notes, pay rates, break durations, and app preferences are stored on your device.</Text>
        <Section title="Information we collect">The current version does not require an account and does not collect personal information on a developer-operated server.</Section>
        <Section title="Local data storage">Timesheet information is stored in the app's local SQLite database. Removing the app may remove this local data unless you have exported or backed it up separately.</Section>
        <Section title="Notifications">If you enable forgotten clock-out reminders, notification permissions and locally scheduled reminders are handled by your device. Reminder settings remain stored locally.</Section>
        <Section title="Exports">PDF and CSV files are created only when you request them. You control where those files are saved or shared using your device's system controls.</Section>
        <Section title="Third-party services">The app is built with Expo and React Native. The current app does not include advertising, behavioral tracking, or third-party analytics. This policy must be updated before enabling any such service.</Section>
        <Section title="Children's privacy">The app is not specifically directed to children under 13 and does not knowingly collect children's personal information.</Section>
        <Section title="Changes to this policy">This policy may be updated when app functionality changes. The latest version will be available from the Settings screen.</Section>
        <View style={styles.notice}><Ionicons name="information-circle-outline" size={20} color="#475569" /><Text style={styles.noticeText}>Before App Store submission, publish this policy on a public web page and add that URL in App Store Connect.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Section({title,children}:{title:string;children:string}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.body}>{children}</Text></View>}
const styles=StyleSheet.create({safeArea:{flex:1,backgroundColor:"#F7F8FC"},container:{padding:22,paddingBottom:44},heroIcon:{width:58,height:58,borderRadius:18,backgroundColor:"#EFF6FF",alignItems:"center",justifyContent:"center",marginTop:14},title:{color:"#0F172A",fontSize:29,fontWeight:"800",lineHeight:36,marginTop:18},updated:{color:"#64748B",fontSize:13,marginTop:7,marginBottom:22},section:{marginTop:23},sectionTitle:{color:"#0F172A",fontSize:17,fontWeight:"800",marginBottom:7},body:{color:"#475569",fontSize:15,lineHeight:23},notice:{flexDirection:"row",gap:10,backgroundColor:"#EEF2F7",borderRadius:16,padding:15,marginTop:28},noticeText:{flex:1,color:"#475569",fontSize:13,lineHeight:19}});
