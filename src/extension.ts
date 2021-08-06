import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
	const configuration = vscode.workspace.getConfiguration()
	const saveAPIUrl:string = configuration.get("xquark.saveAPIUrl")!
	const searchAPIUrl:string = configuration.get("xquark.searchAPIUrl")!
	const uid:string = configuration.get("xquark.uid")!
	const trigger:string = configuration.get("xquark.trigger")!

	const saveCodeCommand = vscode.commands.registerCommand('xquark.saveCode',async function(){
		const editor = vscode.window.activeTextEditor;
		if(editor===undefined) return;

		const fileType = editor.document.fileName.split('.').pop()?.toLowerCase()

		// 用户输入代码片段名称
		const codeKey = await vscode.window.showInputBox({
			placeHolder: "代码片段名称"
		});

		// 保存
		const selection = editor.selection
		const text = editor.document.getText(selection)
		axios.post(saveAPIUrl,{
			key: codeKey,
			code: text,
			uid: uid,
			type: fileType
		}).then(() => {
			vscode.window.showInformationMessage("成功保存代码片段")
		}).catch(error =>{
			vscode.window.showErrorMessage(error.message)
		})
  })

	const searchCodeCommand = vscode.languages.registerCompletionItemProvider({ 
		scheme: 'file'
	},{
		async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
			const fileType = document.fileName.split('.').pop()?.toLowerCase()
			const linePrefix = document.lineAt(position).text.substr(0, position.character).trim()
			if(!linePrefix.endsWith(trigger)) return

			const content = linePrefix.trim().slice(0,-1)
			const {data} = await axios.get(searchAPIUrl,{
				params: {
					content, uid, type:fileType
				}
			}).then(response=>{
				return Promise.resolve(response.data)
			}).catch(err=>{
				console.log(err.message)
			})

			const range = new vscode.Range(position.line,0,position.line, position.character)
			const items:vscode.CompletionItem[] = [];
			for (const record of data) {
				const commandCompletion = new vscode.CompletionItem(record.key);
				let code = record.code
				if(code.includes('\r\n')){
					code = code.split('\r\n')[0]+'...'
				}

				commandCompletion.label = `[${record.key}] ${code}`
				commandCompletion.insertText = record.code
				commandCompletion.detail = '代码'
				commandCompletion.documentation = record.code
				commandCompletion.additionalTextEdits = [vscode.TextEdit.delete(range)];
				items.push(commandCompletion)
			}
			return items;
		}
	},trigger)


	context.subscriptions.push(saveCodeCommand,searchCodeCommand);
}

export function deactivate() {}
