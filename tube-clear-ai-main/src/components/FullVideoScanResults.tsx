import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Music, 
  Mic, 
  Video, 
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface FullVideoScanResultsProps {
  result: {
    metadataScore: number;
    metadataIssues: string[];
    frameAnalysisComplete: boolean;
    framesAnalyzed: number;
    visualViolations: Array<{
      timestamp: number;
      frameNumber: number;
      violation: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
    visualScore: number;
    audioAnalysisComplete: boolean;
    hasMusic: boolean;
    hasVoice: boolean;
    potentialCopyright: boolean;
    audioIssues: string[];
    audioScore: number;
    timelineScanned: boolean;
    totalDuration: number;
    samplePoints: number;
    overallScore: number;
    overallVerdict: 'PASS' | 'FLAGGED' | 'FAIL';
    criticalIssues: string[];
    recommendations: string[];
  };
}

const FullVideoScanResults = ({ result }: FullVideoScanResultsProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'PASS':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" /> PASS</Badge>;
      case 'FLAGGED':
        return <Badge className="bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" /> FLAGGED</Badge>;
      case 'FAIL':
        return <Badge className="bg-red-500 text-white"><XCircle className="h-3 w-3 mr-1" /> FAIL</Badge>;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Overall Verdict Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Full Video Scan Results
              </CardTitle>
              <CardDescription>Comprehensive analysis of metadata, visuals, and audio</CardDescription>
            </div>
            <div className="text-right">
              {getVerdictBadge(result.overallVerdict)}
              <p className={`text-4xl font-bold mt-2 ${getScoreColor(result.overallScore)}`}>
                {result.overallScore}%
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-card border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Metadata</p>
              <p className={`text-2xl font-bold ${getScoreColor(result.metadataScore)}`}>
                {result.metadataScore}%
              </p>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Visual</p>
              <p className={`text-2xl font-bold ${getScoreColor(result.visualScore)}`}>
                {result.visualScore}%
              </p>
            </div>
            <div className="text-center p-4 bg-card border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Audio</p>
              <p className={`text-2xl font-bold ${getScoreColor(result.audioScore)}`}>
                {result.audioScore}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Issues Alert */}
      {result.criticalIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Issues Found</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {result.criticalIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Metadata Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Metadata Analysis
          </CardTitle>
          <CardDescription>Title, description, and tags compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Compliance Score</span>
              <span className={`font-bold ${getScoreColor(result.metadataScore)}`}>
                {result.metadataScore}%
              </span>
            </div>
            <Progress value={result.metadataScore} className="h-2" />
            
            {result.metadataIssues.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Issues Found:</p>
                {result.metadataIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visual/Frame Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-purple-500" />
            Visual & Frame Analysis
          </CardTitle>
          <CardDescription>
            {result.frameAnalysisComplete 
              ? `${result.framesAnalyzed} frames analyzed` 
              : 'Frame analysis not available'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.frameAnalysisComplete ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Visual Compliance</span>
                <span className={`font-bold ${getScoreColor(result.visualScore)}`}>
                  {result.visualScore}%
                </span>
              </div>
              <Progress value={result.visualScore} className="h-2" />
              
              {result.visualViolations.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Timeline Violations:</p>
                  {result.visualViolations.map((violation, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{formatTime(violation.timestamp)}</span>
                          <Badge className={`${getSeverityColor(violation.severity)} text-white text-xs`}>
                            {violation.severity}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm">{violation.violation}</p>
                      {violation.description && (
                        <p className="text-xs text-muted-foreground mt-1">{violation.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Frame analysis requires video download. Check if the video URL is accessible.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Audio Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex gap-2">
              <Music className="h-5 w-5 text-pink-500" />
              <Mic className="h-5 w-5 text-indigo-500" />
            </div>
            Audio Analysis
          </CardTitle>
          <CardDescription>Music, voice, and copyright detection</CardDescription>
        </CardHeader>
        <CardContent>
          {result.audioAnalysisComplete ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Audio Compliance</span>
                <span className={`font-bold ${getScoreColor(result.audioScore)}`}>
                  {result.audioScore}%
                </span>
              </div>
              <Progress value={result.audioScore} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-card border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Music className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium">Music Detected</span>
                  </div>
                  <p className="text-lg font-bold">
                    {result.hasMusic ? 'Yes' : 'No'}
                  </p>
                </div>
                
                <div className="p-3 bg-card border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium">Voice Detected</span>
                  </div>
                  <p className="text-lg font-bold">
                    {result.hasVoice ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              
              {result.potentialCopyright && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Potential Copyright Issue</AlertTitle>
                  <AlertDescription>
                    Copyrighted music or content detected. Verify licensing to avoid demonetization.
                  </AlertDescription>
                </Alert>
              )}
              
              {result.audioIssues.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Audio Issues:</p>
                  {result.audioIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Audio analysis requires video download.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-500" />
            Timeline Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Duration</p>
              <p className="text-xl font-bold">{formatTime(result.totalDuration)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sample Points</p>
              <p className="text-xl font-bold">{result.samplePoints}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <CheckCircle className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FullVideoScanResults;
