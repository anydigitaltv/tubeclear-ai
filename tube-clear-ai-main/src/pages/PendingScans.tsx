import { PendingScanQueue } from "@/components/PendingScanQueue";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";

const PendingScans = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <TopBar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient">Pending Scans</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your paused, failed, and queued scans. Resume scans after fixing API key issues.
          </p>
        </div>

        <PendingScanQueue />
      </motion.div>
    </div>
  );
};

export default PendingScans;
