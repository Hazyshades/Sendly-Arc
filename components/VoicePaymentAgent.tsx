import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Spinner } from './ui/spinner';
import { toast } from 'sonner';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '../utils/web3/wagmiConfig';
import web3Service from '../utils/web3/web3Service';
import pinataService from '../utils/pinata';
import imageGenerator from '../utils/imageGenerator';
import elevenLabsService from '../utils/elevenlabs';
import aimlapiService, { ParsedPaymentCommand } from '../utils/aimlapiService';
import { ContactsManager, Contact } from './ContactsManager';

type RecordingState = 'idle' | 'recording' | 'processing' | 'confirming' | 'creating';

export function VoicePaymentAgent() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedCommand, setParsedCommand] = useState<ParsedPaymentCommand | null>(null);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      setError('');
      setTranscribedText('');
      setParsedCommand(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
      console.log('Using mime type:', supportedMimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        console.log('Number of chunks:', audioChunksRef.current.length);
        
        if (audioBlob.size === 0) {
          console.error('Empty audio blob recorded');
          setError('Recording is too short. Please try again.');
          toast.error('Recording is too short. Please try again.');
          setRecordingState('idle');
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          return;
        }
        
        await processAudio(audioBlob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setRecordingState('recording');
      toast.info('Recording started... Speak now');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access error');
      toast.error('Failed to access microphone');
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      setRecordingState('processing');
      toast.info('Processing voice command...');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const transcription = await elevenLabsService.transcribeAudio(audioBlob);
      const text = transcription.text;
      
      setTranscribedText(text);
      toast.success('Speech recognized');

      console.log('Transcribed text:', text);
      console.log('Contacts:', contacts);

      const parsed = await aimlapiService.parsePaymentCommand(text, contacts);
      
      console.log('Parsed command:', parsed);

      if (!parsed) {
        throw new Error('Failed to process command');
      }

      if (!parsed.recipientName) {
        setError('Recipient name not found in contacts');
        setRecordingState('idle');
        return;
      }

      const recipientNameLower = parsed.recipientName!.toLowerCase().trim();
      const contact = contacts.find(c => c.name.toLowerCase().trim() === recipientNameLower);
      
      console.log('Looking for contact:', parsed.recipientName, 'lowercase:', recipientNameLower);
      console.log('Available contacts:', contacts.map(c => c.name));
      console.log('Found contact:', contact);
      
      if (!contact) {
        setError('Contact not found');
        setRecordingState('idle');
        return;
      }

      setParsedCommand({
        ...parsed,
        recipientName: contact.name,
      });
      
      setRecordingState('confirming');
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Audio processing error');
      toast.error('Error processing command');
      setRecordingState('idle');
    }
  };

  const confirmAndCreate = async () => {
    if (!parsedCommand || !isConnected || !address) {
      return;
    }

    const contact = contacts.find(c => c.name.toLowerCase() === parsedCommand.recipientName.toLowerCase());
    if (!contact) {
      setError('Contact not found');
      return;
    }

    setRecordingState('creating');
    setError('');

    try {
      const imageBlob = await imageGenerator.generateGiftCardImage({
        amount: parsedCommand.amount.toString(),
        currency: parsedCommand.currency,
        message: parsedCommand.message || parsedCommand.occasion || 'Best wishes',
        design: 'pink',
      });

      const metadataUri = await pinataService.createGiftCardNFT(
        parsedCommand.amount.toString(),
        parsedCommand.currency,
        parsedCommand.message || parsedCommand.occasion || 'Best wishes',
        'pink',
        imageBlob
      );

      let clientToUse = walletClient;
      if (!clientToUse) {
        clientToUse = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });
      }

      await web3Service.initialize(clientToUse, address);

      await web3Service.createGiftCard(
        contact.wallet,
        parsedCommand.amount.toString(),
        parsedCommand.currency,
        metadataUri,
        parsedCommand.message || parsedCommand.occasion || 'Best wishes'
      );

      toast.success('Gift card created successfully!');
      
      setTranscribedText('');
      setParsedCommand(null);
      setRecordingState('idle');
    } catch (err) {
      console.error('Error creating gift card:', err);
      setError(err instanceof Error ? err.message : 'Error creating card');
      toast.error('Error creating card');
      setRecordingState('idle');
    }
  };

  const cancel = () => {
    setTranscribedText('');
    setParsedCommand(null);
    setError('');
    setRecordingState('idle');
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to use the voice agent
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-semibold">Voice AI Agent</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-5 h-5 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              Connect your contacts and speak natural language commands
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-gray-600">
          Say a command like: "Send Alice a gift card for her birthday with $25"
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voice Command</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    size="lg"
                    variant={recordingState === 'recording' ? 'destructive' : 'default'}
                    onClick={recordingState === 'recording' ? stopRecording : startRecording}
                    disabled={recordingState === 'processing' || recordingState === 'creating' || contacts.length === 0}
                    className="w-32 h-32 rounded-full"
                  >
                    {recordingState === 'recording' ? (
                      <MicOff className="w-8 h-8" />
                    ) : recordingState === 'processing' || recordingState === 'creating' ? (
                      <Spinner className="w-8 h-8" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {contacts.length === 0 && 'Add contacts first to use voice commands'}
                {contacts.length > 0 && recordingState === 'idle' && 'Click to start recording'}
                {recordingState === 'recording' && 'Click to stop recording'}
                {(recordingState === 'processing' || recordingState === 'creating') && 'Processing...'}
              </TooltipContent>
            </Tooltip>
          </div>

          {recordingState === 'recording' && (
            <div className="text-center">
              <Badge variant="destructive" className="animate-pulse">
                Recording...
              </Badge>
            </div>
          )}

          {transcribedText && (
            <Alert>
              <AlertDescription>
                <div className="font-medium mb-2">Transcribed text:</div>
                <div className="text-sm">{transcribedText}</div>
              </AlertDescription>
            </Alert>
          )}

          {parsedCommand && recordingState === 'confirming' && (
            <Alert>
              <AlertDescription className="space-y-4">
                <div className="font-medium mb-2">Confirm card creation:</div>
                <div className="space-y-2 text-sm">
                  <div><strong>Recipient:</strong> {parsedCommand.recipientName}</div>
                  <div><strong>Amount:</strong> ${parsedCommand.amount} {parsedCommand.currency}</div>
                  {parsedCommand.message && (
                    <div><strong>Message:</strong> {parsedCommand.message}</div>
                  )}
                  {parsedCommand.occasion && (
                    <div><strong>Occasion:</strong> {parsedCommand.occasion}</div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={confirmAndCreate} className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                  <Button onClick={cancel} variant="outline" className="flex-1">
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {recordingState === 'creating' && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  Creating gift card...
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Separator />

      <ContactsManager contacts={contacts} onContactsChange={setContacts} />
    </div>
  );
}

