import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResumeDraft } from "@/types/resume";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  name: { fontSize: 20, marginBottom: 2 },
  title: { fontSize: 12, color: "#52525b", marginBottom: 12 },
  summary: { marginBottom: 16, lineHeight: 1.4 },
  entry: { marginBottom: 10 },
  entryHeading: { fontSize: 12, marginBottom: 2 },
  entryDescription: { color: "#3f3f46" },
});

export function ResumePdfDocument({ resumeDraft }: { resumeDraft: ResumeDraft }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{resumeDraft.name || "Your Name"}</Text>
        <Text style={styles.title}>{resumeDraft.title || "Target Role"}</Text>
        <Text style={styles.summary}>{resumeDraft.summary}</Text>
        <View>
          {resumeDraft.experience.map((entry, index) => (
            <View key={`${entry.company}-${index}`} style={styles.entry}>
              <Text style={styles.entryHeading}>
                {entry.role} · {entry.company}
              </Text>
              <Text style={styles.entryDescription}>{entry.description}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
