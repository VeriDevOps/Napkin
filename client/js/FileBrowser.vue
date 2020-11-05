<template>
<div>
	<label for="fileLoader" class="button">{{buttontext}}</label>
	<input
		id="fileLoader" ref="fileLoader" type="file"
			@change="updateSelection()" accept=".jsondiff"
			multiple="multiple" style="display:none">
	<table>
		<thead align="left"><tr><th v-if="files.length > 0">{{loadedText}}</th></tr></thead>
		<tbody>
			<tr	v-for="file in files">
				<td class="filerow">{{file.path}}</td>
			</tr>
		</tbody>
	</table>
</div>
</template>

<script>
import bus from "./EventBus.vue"

export default {
	name: 'filebrowser',
	props: {
		buttontext: {
			type: String,
			required: true
		},
		initialPath: {
			type: String,
			required: true
		},
		separator: {
			type: String,
			required: true
		}
	},
	data() {
		return {
		   files: [],
		   loadedText: "Currently loaded files:"
		}
	},
	methods: {
		updateSelection() {
			var self = this;

			self.files = [];
			for (var i=0; i<self.$refs.fileLoader.files.length; i++) {
				self.files.push({path: self.$refs.fileLoader.files[i].name});
			}

			//TODO:  Who should load the files, the server or the client?
			// this.$emit('load', this.$refs.fileLoader.files[0]);
			//TODO: Extend to handle several files
			self.loadFile(self.$refs.fileLoader.files[0])
		},
		/** Read the contents of the selected file and notify other components
		* (e.g. SignalList) about new jsondiff-data */
		loadFile(file) {
			console.log("Loading " + file.name);
			var reader = new FileReader();
			reader.onload = function(e) {
        let jsondiff = JSON.parse(e.target.result);
        //console.log("FileBrowser.vue::loadFile loaded ", jsondiff);
				bus.$emit('jsondiff-loaded',jsondiff );
        //console.log("FileBrowser.vue::loadFile sent jsondiff event");
			};
			reader.readAsText(file);
		}
	},
	created() {
		var self = this;
		self.files.push({path: self.initialPath})
	}
}
</script>

<style>
.button {
	display: inline-block;
	background: #bfbfbf;
	border-radius: 4px;
	border: 1px solid black;
	font-family: "arial-black";
	font-size: 14px;
	color: #000;
	padding: 5px 5px;
	cursor: pointer;
	margin-top: 10px;
	margin-bottom: 10px;
}

.filerow {
	padding-left: 30px;
}
</style>
